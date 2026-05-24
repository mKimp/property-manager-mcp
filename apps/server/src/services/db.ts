import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { Property } from "../types.js";

// ---------------------------------------------------------------------------
// Prisma client — lazy singleton so env vars are resolved before first use
// ---------------------------------------------------------------------------

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) {
      throw new Error("Missing env var: TURSO_DATABASE_URL");
    }
    const adapter = new PrismaLibSql({ url, authToken });
    _prisma = new PrismaClient({ adapter });
  }
  return _prisma;
}

// ---------------------------------------------------------------------------
// Include shape used for every query
// ---------------------------------------------------------------------------

const INCLUDE = {
  tenants: true,
  repairs: true,
  rentRecords: true,
  utilitiesRecords: true,
} as const;

// ---------------------------------------------------------------------------
// Type aliases for Prisma query results
// ---------------------------------------------------------------------------

type PrismaPropertyRow = NonNullable<
  Awaited<ReturnType<PrismaClient["property"]["findUnique"]>>
>;
type PrismaTenantRow = NonNullable<
  Awaited<ReturnType<PrismaClient["tenant"]["findFirst"]>>
>;
type PrismaRepairRow = NonNullable<
  Awaited<ReturnType<PrismaClient["repairExpense"]["findFirst"]>>
>;
type PrismaRentRow = NonNullable<
  Awaited<ReturnType<PrismaClient["rentRecord"]["findFirst"]>>
>;
type PrismaUtilitiesRow = NonNullable<
  Awaited<ReturnType<PrismaClient["utilitiesRecord"]["findFirst"]>>
>;

type PrismaPropertyWithRelations = PrismaPropertyRow & {
  tenants: PrismaTenantRow[];
  repairs: PrismaRepairRow[];
  rentRecords: PrismaRentRow[];
  utilitiesRecords: PrismaUtilitiesRow[];
};

// ---------------------------------------------------------------------------
// Converter: Prisma row → TypeScript Property
// ---------------------------------------------------------------------------

function toProperty(p: PrismaPropertyWithRelations): Property {
  return {
    id: p.id,
    propertyName: p.propertyName,
    address: {
      street: p.street,
      city: p.city,
      state: p.state,
      zip: p.zip,
      country: p.country,
    },
    rent: p.rent,
    currency: p.currency,
    tenants: p.tenants.map((t) => ({
      name: t.name,
      email: t.email ?? undefined,
      phone: t.phone ?? undefined,
    })),
    leaseStart: p.leaseStart ?? undefined,
    leaseEnd: p.leaseEnd ?? undefined,
    propertyManager: p.propertyManager ?? undefined,
    notes: p.notes ?? undefined,
    repairs: p.repairs.map((r) => ({
      id: r.id,
      description: r.description,
      amount: r.amount,
      date: r.date,
      year: r.year,
      vendor: r.vendor ?? undefined,
      notes: r.notes ?? undefined,
    })),
    rentRecords: p.rentRecords.map((r) => ({
      year: r.year,
      month: r.month,
      amount: r.amount,
      paid: r.paid,
      paidDate: r.paidDate ?? undefined,
      notes: r.notes ?? undefined,
    })),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    mortgage:
      p.mortgageMonthlyPayment != null
        ? {
            lender: p.mortgageLender ?? undefined,
            monthlyPayment: p.mortgageMonthlyPayment,
            interestRate: p.mortgageInterestRate ?? undefined,
            termYears: p.mortgageTermYears ?? undefined,
            startDate: p.mortgageStartDate ?? undefined,
          }
        : undefined,
    propertyTax: p.propertyTax ?? undefined,
    utilitiesRecords: p.utilitiesRecords.map((r) => ({
      year: r.year,
      month: r.month,
      utilities: {
        electricity: r.electricity ?? undefined,
        water: r.water ?? undefined,
        gas: r.gas ?? undefined,
        internet: r.internet ?? undefined,
        trash: r.trash ?? undefined,
      },
      paid: r.paid,
      paidDate: r.paidDate ?? undefined,
      notes: r.notes ?? undefined,
    })),
  };
}

// ---------------------------------------------------------------------------
// Public API (mirrors the old storage.ts surface)
// ---------------------------------------------------------------------------

export async function getAllProperties(): Promise<Property[]> {
  const prisma = getPrisma();
  const rows = await prisma.property.findMany({
    include: INCLUDE,
    orderBy: { state: "asc" },
  });
  return rows.map(toProperty);
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const prisma = getPrisma();
  const row = await prisma.property.findUnique({
    where: { id },
    include: INCLUDE,
  });
  return row ? toProperty(row) : null;
}

/**
 * Full upsert of a property and all its related records.
 * Runs in a transaction: property is upserted first, then related records are
 * wiped and re-inserted to match the in-memory state exactly.
 */
export async function saveProperty(property: Property): Promise<void> {
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    // 1. Upsert the property row (scalar + flattened mortgage/address fields)
    await tx.property.upsert({
      where: { id: property.id },
      create: {
        id: property.id,
        propertyName: property.propertyName,
        street: property.address.street,
        city: property.address.city,
        state: property.address.state,
        zip: property.address.zip,
        country: property.address.country,
        rent: property.rent,
        currency: property.currency,
        leaseStart: property.leaseStart ?? null,
        leaseEnd: property.leaseEnd ?? null,
        propertyManager: property.propertyManager ?? null,
        notes: property.notes ?? null,
        propertyTax: property.propertyTax ?? null,
        mortgageLender: property.mortgage?.lender ?? null,
        mortgageMonthlyPayment: property.mortgage?.monthlyPayment ?? null,
        mortgageInterestRate: property.mortgage?.interestRate ?? null,
        mortgageTermYears: property.mortgage?.termYears ?? null,
        mortgageStartDate: property.mortgage?.startDate ?? null,
        createdAt: new Date(property.createdAt),
        // updatedAt is handled by @updatedAt directive
      },
      update: {
        propertyName: property.propertyName,
        street: property.address.street,
        city: property.address.city,
        state: property.address.state,
        zip: property.address.zip,
        country: property.address.country,
        rent: property.rent,
        currency: property.currency,
        leaseStart: property.leaseStart ?? null,
        leaseEnd: property.leaseEnd ?? null,
        propertyManager: property.propertyManager ?? null,
        notes: property.notes ?? null,
        propertyTax: property.propertyTax ?? null,
        mortgageLender: property.mortgage?.lender ?? null,
        mortgageMonthlyPayment: property.mortgage?.monthlyPayment ?? null,
        mortgageInterestRate: property.mortgage?.interestRate ?? null,
        mortgageTermYears: property.mortgage?.termYears ?? null,
        mortgageStartDate: property.mortgage?.startDate ?? null,
        // createdAt intentionally omitted — never overwrite
      },
    });

    // 2. Sync tenants (no IDs in TypeScript type → full replace)
    await tx.tenant.deleteMany({ where: { propertyId: property.id } });
    if (property.tenants.length > 0) {
      await tx.tenant.createMany({
        data: property.tenants.map((t) => ({
          propertyId: property.id,
          name: t.name,
          email: t.email ?? null,
          phone: t.phone ?? null,
        })),
      });
    }

    // 3. Sync repair expenses (full replace preserves original IDs)
    await tx.repairExpense.deleteMany({ where: { propertyId: property.id } });
    if (property.repairs.length > 0) {
      await tx.repairExpense.createMany({
        data: property.repairs.map((r) => ({
          id: r.id,
          propertyId: property.id,
          description: r.description,
          amount: r.amount,
          date: r.date,
          year: r.year,
          vendor: r.vendor ?? null,
          notes: r.notes ?? null,
        })),
      });
    }

    // 4. Sync rent records
    await tx.rentRecord.deleteMany({ where: { propertyId: property.id } });
    if (property.rentRecords.length > 0) {
      await tx.rentRecord.createMany({
        data: property.rentRecords.map((r) => ({
          propertyId: property.id,
          year: r.year,
          month: r.month,
          amount: r.amount,
          paid: r.paid,
          paidDate: r.paidDate ?? null,
          notes: r.notes ?? null,
        })),
      });
    }

    // 5. Sync utilities records
    await tx.utilitiesRecord.deleteMany({ where: { propertyId: property.id } });
    if (property.utilitiesRecords.length > 0) {
      await tx.utilitiesRecord.createMany({
        data: property.utilitiesRecords.map((r) => ({
          propertyId: property.id,
          year: r.year,
          month: r.month,
          electricity: r.utilities.electricity ?? null,
          water: r.utilities.water ?? null,
          gas: r.utilities.gas ?? null,
          internet: r.utilities.internet ?? null,
          trash: r.utilities.trash ?? null,
          paid: r.paid,
          paidDate: r.paidDate ?? null,
          notes: r.notes ?? null,
        })),
      });
    }
  });
}

/**
 * Delete a property by ID. All related records are removed via cascade.
 * Returns true if found and deleted, false if not found.
 */
export async function deleteProperty(id: string): Promise<boolean> {
  const prisma = getPrisma();
  try {
    await prisma.property.delete({ where: { id } });
    return true;
  } catch {
    // Prisma throws P2025 if the record doesn't exist
    return false;
  }
}
