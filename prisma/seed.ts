/**
 * prisma/seed.ts
 *
 * Re-imports test property data from prisma/seed-data.json into Turso.
 * Idempotent — safe to run multiple times (upserts, not inserts).
 *
 * Usage:
 *   npm run seed
 */

import "dotenv/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Resolve paths relative to this file (works in both CJS and ESM)
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Load seed data
// ---------------------------------------------------------------------------

const seedPath = resolve(__dirname, "seed-data.json");
const raw = JSON.parse(readFileSync(seedPath, "utf-8")) as {
  properties: Record<string, SeedProperty>;
};

// Minimal types matching seed-data.json shape

interface SeedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface SeedTenant {
  name: string;
  email?: string;
  phone?: string;
}

interface SeedRepair {
  id: string;
  description: string;
  amount: number;
  date: string;
  year: number;
  vendor?: string;
  notes?: string;
}

interface SeedRentRecord {
  year: number;
  month: number;
  amount: number;
  paid: boolean;
  paidDate?: string;
  notes?: string;
}

interface SeedUtilitiesRecord {
  year: number;
  month: number;
  utilities: {
    electricity?: number;
    water?: number;
    gas?: number;
    internet?: number;
    trash?: number;
  };
  paid: boolean;
  paidDate?: string;
  notes?: string;
}

interface SeedMortgage {
  lender?: string;
  monthlyPayment?: number;
  interestRate?: number;
  termYears?: number;
  startDate?: string;
}

interface SeedProperty {
  id: string;
  propertyName: string;
  address: SeedAddress;
  rent: number;
  currency?: string;
  tenants: SeedTenant[];
  leaseStart?: string;
  leaseEnd?: string;
  propertyManager?: string;
  notes?: string;
  repairs: SeedRepair[];
  rentRecords: SeedRentRecord[];
  createdAt: string;
  updatedAt: string;
  mortgage?: SeedMortgage;
  propertyTax?: number;
  utilitiesRecords: SeedUtilitiesRecord[];
}

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  // Build the Prisma client here so dotenv has definitely populated env vars
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    console.error("❌  Missing env var: TURSO_DATABASE_URL");
    process.exit(1);
  }
  const adapter = new PrismaLibSql({ url, authToken });
  const prisma = new PrismaClient({ adapter });

  const properties = Object.values(raw.properties);
  console.log(`\n🌱  Seeding ${properties.length} properties into Turso…\n`);

  for (const p of properties) {
    await prisma.$transaction(async (tx: any) => {
      // 1. Upsert property row
      await tx.property.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          propertyName: p.propertyName,
          street: p.address.street,
          city: p.address.city,
          state: p.address.state,
          zip: p.address.zip,
          country: p.address.country,
          rent: p.rent,
          currency: p.currency ?? "USD",
          leaseStart: p.leaseStart ?? null,
          leaseEnd: p.leaseEnd ?? null,
          propertyManager: p.propertyManager ?? null,
          notes: p.notes ?? null,
          propertyTax: p.propertyTax ?? null,
          mortgageLender: p.mortgage?.lender ?? null,
          mortgageMonthlyPayment: p.mortgage?.monthlyPayment ?? null,
          mortgageInterestRate: p.mortgage?.interestRate ?? null,
          mortgageTermYears: p.mortgage?.termYears ?? null,
          mortgageStartDate: p.mortgage?.startDate ?? null,
          createdAt: new Date(p.createdAt),
        },
        update: {
          propertyName: p.propertyName,
          street: p.address.street,
          city: p.address.city,
          state: p.address.state,
          zip: p.address.zip,
          country: p.address.country,
          rent: p.rent,
          currency: p.currency ?? "USD",
          leaseStart: p.leaseStart ?? null,
          leaseEnd: p.leaseEnd ?? null,
          propertyManager: p.propertyManager ?? null,
          notes: p.notes ?? null,
          propertyTax: p.propertyTax ?? null,
          mortgageLender: p.mortgage?.lender ?? null,
          mortgageMonthlyPayment: p.mortgage?.monthlyPayment ?? null,
          mortgageInterestRate: p.mortgage?.interestRate ?? null,
          mortgageTermYears: p.mortgage?.termYears ?? null,
          mortgageStartDate: p.mortgage?.startDate ?? null,
        },
      });

      // 2. Sync tenants (full replace)
      await tx.tenant.deleteMany({ where: { propertyId: p.id } });
      if (p.tenants.length > 0) {
        await tx.tenant.createMany({
          data: p.tenants.map((t) => ({
            propertyId: p.id,
            name: t.name,
            email: t.email ?? null,
            phone: t.phone ?? null,
          })),
        });
      }

      // 3. Sync repair expenses (full replace, preserves original IDs)
      await tx.repairExpense.deleteMany({ where: { propertyId: p.id } });
      if (p.repairs.length > 0) {
        await tx.repairExpense.createMany({
          data: p.repairs.map((r) => ({
            id: r.id,
            propertyId: p.id,
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
      await tx.rentRecord.deleteMany({ where: { propertyId: p.id } });
      if (p.rentRecords.length > 0) {
        await tx.rentRecord.createMany({
          data: p.rentRecords.map((r) => ({
            propertyId: p.id,
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
      await tx.utilitiesRecord.deleteMany({ where: { propertyId: p.id } });
      if (p.utilitiesRecords.length > 0) {
        await tx.utilitiesRecord.createMany({
          data: p.utilitiesRecords.map((r) => ({
            propertyId: p.id,
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

    console.log(`  ✅  ${p.propertyName} (${p.id.slice(0, 8)}…)`);
  }

  console.log("\n🎉  Seed complete.\n");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err);
  process.exit(1);
});
