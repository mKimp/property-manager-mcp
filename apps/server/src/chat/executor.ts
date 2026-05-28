/**
 * Tool executor for the chat agentic loop.
 * Receives a tool_use block from Claude and routes it to the correct
 * DB operation, returning a plain-text result string.
 */
import { v4 as uuidv4 } from "uuid";
import {
  getAllProperties,
  getPropertyById,
  saveProperty,
  deleteProperty,
} from "../services/db.js";
import { Property, RentRecord, UtilitiesRecord } from "../types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmt(n: number): string {
  return `$${n.toFixed(2)}`;
}

function currentYear(): number { return new Date().getFullYear(); }
function currentMonth(): number { return new Date().getMonth() + 1; }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a named tool with the given input (as parsed from Claude's tool_use block).
 * Returns a string result to send back as a tool_result block.
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      // ── Properties ──────────────────────────────────────────────────────
      case "property_list_all": return await propertyListAll();
      case "property_get":      return await propertyGet(input);
      case "property_search":   return await propertySearch(input);
      case "property_add":      return await propertyAdd(input);
      case "property_update":   return await propertyUpdate(input);
      case "property_delete":   return await propertyDeleteOp(input);
      // ── Repairs ─────────────────────────────────────────────────────────
      case "repair_add":          return await repairAdd(input);
      case "repair_delete":       return await repairDelete(input);
      case "repair_list":         return await repairList(input);
      case "repair_list_by_year": return await repairListByYear(input);
      // ── Rent ────────────────────────────────────────────────────────────
      case "rent_add_record":     return await rentAddRecord(input);
      case "rent_update_record":  return await rentUpdateRecord(input);
      case "rent_list_by_year":   return await rentListByYear(input);
      case "rent_list_all":       return await rentListAll(input);
      // ── Utilities ────────────────────────────────────────────────────────
      case "utilities_add_record":     return await utilitiesAddRecord(input);
      case "utilities_update_record":  return await utilitiesUpdateRecord(input);
      case "utilities_list_by_year":   return await utilitiesListByYear(input);
      case "utilities_list_all":       return await utilitiesListAll(input);

      default:
        return `Error: Unknown tool "${toolName}".`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error executing ${toolName}: ${msg}`;
  }
}

// ---------------------------------------------------------------------------
// Property tools
// ---------------------------------------------------------------------------

async function propertyListAll(): Promise<string> {
  const props = await getAllProperties();
  if (props.length === 0) return "No properties found.";
  const summaries = props.map((p) => ({
    id: p.id,
    propertyName: p.propertyName,
    address: p.address,
    rent: p.rent,
    currency: p.currency,
    tenants: p.tenants,
    leaseStart: p.leaseStart,
    leaseEnd: p.leaseEnd,
    propertyManager: p.propertyManager,
    notes: p.notes,
    repairCount: p.repairs.length,
    rentRecordCount: p.rentRecords.length,
    mortgage: p.mortgage,
    propertyTax: p.propertyTax,
  }));
  return JSON.stringify(summaries, null, 2);
}

async function propertyGet(input: Record<string, unknown>): Promise<string> {
  const { propertyId } = input as { propertyId: string };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;
  return JSON.stringify(property, null, 2);
}

async function propertySearch(input: Record<string, unknown>): Promise<string> {
  const { city, state, propertyName, tenantName, street } =
    input as Record<string, string | undefined>;
  const props = await getAllProperties();
  const matches = props.filter((p) => {
    if (city && !p.address.city.toLowerCase().includes(city.toLowerCase())) return false;
    if (state && !p.address.state.toLowerCase().includes(state.toLowerCase())) return false;
    if (propertyName && !p.propertyName.toLowerCase().includes(propertyName.toLowerCase()))
      return false;
    if (street && !p.address.street.toLowerCase().includes(street.toLowerCase())) return false;
    if (
      tenantName &&
      !p.tenants.some((t) => t.name.toLowerCase().includes(tenantName.toLowerCase()))
    )
      return false;
    return true;
  });
  if (matches.length === 0) return "No properties matched the search criteria.";
  return JSON.stringify(
    matches.map((p) => ({ id: p.id, propertyName: p.propertyName, address: p.address })),
    null,
    2
  );
}

async function propertyAdd(input: Record<string, unknown>): Promise<string> {
  const now = new Date().toISOString();
  const data = input as Partial<Property> & {
    propertyName: string;
    address: Property["address"];
    rent: number;
    tenants: Property["tenants"];
  };
  const property: Property = {
    id: uuidv4(),
    propertyName: data.propertyName,
    address: { ...data.address, country: (data.address as Partial<typeof data.address>).country ?? "US" },
    rent: data.rent,
    currency: (data.currency as string) ?? "USD",
    tenants: data.tenants ?? [],
    leaseStart: data.leaseStart,
    leaseEnd: data.leaseEnd,
    propertyManager: data.propertyManager,
    notes: data.notes,
    repairs: [],
    rentRecords: [],
    utilitiesRecords: [],
    createdAt: now,
    updatedAt: now,
    mortgage: data.mortgage
      ? {
          ...data.mortgage,
          monthlyPayment: (data.mortgage as { monthlyPayment?: number }).monthlyPayment ?? 0,
        }
      : undefined,
    propertyTax: (data.propertyTax as number) ?? 0,
  };
  await saveProperty(property);
  return `Property '${property.propertyName}' added with ID ${property.id}.\n\n${JSON.stringify(property, null, 2)}`;
}

async function propertyUpdate(input: Record<string, unknown>): Promise<string> {
  const { propertyId, ...updates } = input as { propertyId: string } & Partial<Property>;
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const u = updates as Record<string, unknown>;
  if (u.address) property.address = { ...property.address, ...(u.address as object) };
  if (u.propertyName !== undefined) property.propertyName = u.propertyName as string;
  if (u.rent !== undefined) property.rent = u.rent as number;
  if (u.currency !== undefined) property.currency = u.currency as string;
  if (u.tenants !== undefined) property.tenants = u.tenants as Property["tenants"];
  if (u.leaseStart !== undefined) property.leaseStart = u.leaseStart as string;
  if (u.leaseEnd !== undefined) property.leaseEnd = u.leaseEnd as string;
  if (u.propertyManager !== undefined) property.propertyManager = u.propertyManager as string;
  if (u.notes !== undefined) property.notes = u.notes as string;
  if (u.propertyTax !== undefined) property.propertyTax = u.propertyTax as number;
  if (u.mortgage !== undefined) {
    const m = u.mortgage as Record<string, unknown>;
    property.mortgage = {
      ...property.mortgage,
      ...(m as object),
      monthlyPayment:
        (m.monthlyPayment as number) ?? property.mortgage?.monthlyPayment ?? 0,
    };
  }
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Property '${property.propertyName}' updated.\n\n${JSON.stringify(property, null, 2)}`;
}

async function propertyDeleteOp(input: Record<string, unknown>): Promise<string> {
  const { propertyId, dryRun = false } = input as {
    propertyId: string;
    dryRun?: boolean;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const summary = {
    id: property.id,
    propertyName: property.propertyName,
    address: property.address,
    repairCount: property.repairs.length,
    rentRecordCount: property.rentRecords.length,
    totalRepairCost: property.repairs.reduce((s, r) => s + r.amount, 0),
  };

  if (dryRun) {
    return `DRY RUN — would delete:\n${JSON.stringify(summary, null, 2)}\n\nCall again with dryRun=false to confirm.`;
  }

  await deleteProperty(propertyId);
  return `Property '${summary.propertyName}' (${propertyId}) has been deleted.`;
}

// ---------------------------------------------------------------------------
// Repair tools
// ---------------------------------------------------------------------------

async function repairAdd(input: Record<string, unknown>): Promise<string> {
  const { propertyId, description, amount, date, vendor, notes } = input as {
    propertyId: string;
    description: string;
    amount: number;
    date: string;
    vendor?: string;
    notes?: string;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const year = parseInt(date.substring(0, 4), 10);
  const repair = { id: uuidv4(), description, amount, date, year, vendor, notes };
  property.repairs.push(repair);
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Repair '${description}' (${fmt(amount)}) added to '${property.propertyName}'.\n\n${JSON.stringify(repair, null, 2)}`;
}

async function repairDelete(input: Record<string, unknown>): Promise<string> {
  const { propertyId, repairId } = input as { propertyId: string; repairId: string };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const idx = property.repairs.findIndex((r) => r.id === repairId);
  if (idx === -1)
    return `Error: Repair '${repairId}' not found on '${property.propertyName}'.`;

  const [deleted] = property.repairs.splice(idx, 1);
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Repair '${deleted.description}' deleted from '${property.propertyName}'.`;
}

async function repairList(input: Record<string, unknown>): Promise<string> {
  const { propertyId } = input as { propertyId: string };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const sorted = [...property.repairs].sort((a, b) => b.date.localeCompare(a.date));
  const total = sorted.reduce((s, r) => s + r.amount, 0);
  return JSON.stringify({ propertyName: property.propertyName, repairs: sorted, total, currency: property.currency }, null, 2);
}

async function repairListByYear(input: Record<string, unknown>): Promise<string> {
  const { propertyId, year } = input as { propertyId: string; year: number };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const repairs = property.repairs
    .filter((r) => r.year === year)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = repairs.reduce((s, r) => s + r.amount, 0);
  return JSON.stringify({
    propertyName: property.propertyName,
    year,
    repairs,
    total,
    currency: property.currency,
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Rent tools
// ---------------------------------------------------------------------------

async function rentAddRecord(input: Record<string, unknown>): Promise<string> {
  const { propertyId, year, month, amount, paid, paidDate, notes } = input as {
    propertyId: string;
    year: number;
    month: number;
    amount: number;
    paid: boolean;
    paidDate?: string;
    notes?: string;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const exists = property.rentRecords.find((r) => r.year === year && r.month === month);
  if (exists)
    return `Error: A rent record for ${MONTH_NAMES[month]} ${year} already exists on '${property.propertyName}'. Use rent_update_record to modify it.`;

  const record: RentRecord = { year, month, amount, paid, paidDate, notes };
  property.rentRecords.push(record);
  property.rentRecords.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Rent record for ${MONTH_NAMES[month]} ${year} added to '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}`;
}

async function rentUpdateRecord(input: Record<string, unknown>): Promise<string> {
  const { propertyId, year, month, paid, paidDate, amount, notes } = input as {
    propertyId: string;
    year: number;
    month: number;
    paid?: boolean;
    paidDate?: string;
    amount?: number;
    notes?: string;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const record = property.rentRecords.find((r) => r.year === year && r.month === month);
  if (!record)
    return `Error: No rent record for ${MONTH_NAMES[month]} ${year} on '${property.propertyName}'.`;

  if (paid !== undefined) record.paid = paid;
  if (paidDate !== undefined) record.paidDate = paidDate;
  if (amount !== undefined) record.amount = amount;
  if (notes !== undefined) record.notes = notes;
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Rent record for ${MONTH_NAMES[month]} ${year} updated on '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}`;
}

async function rentListByYear(input: Record<string, unknown>): Promise<string> {
  const { propertyId, year } = input as { propertyId: string; year: number };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const records = property.rentRecords
    .filter((r) => r.year === year)
    .sort((a, b) => a.month - b.month)
    .map((r) => ({ ...r, monthName: MONTH_NAMES[r.month] }));

  const totalDue = records.reduce((s, r) => s + r.amount, 0);
  const totalCollected = records.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
  const unpaidMonths = records.filter((r) => !r.paid).map((r) => r.monthName);

  return JSON.stringify({
    propertyName: property.propertyName,
    year,
    currency: property.currency,
    records,
    totalCollected,
    totalDue,
    unpaidMonths,
    collectionRate: totalDue > 0 ? `${Math.round((totalCollected / totalDue) * 100)}%` : "N/A",
  }, null, 2);
}

async function rentListAll(input: Record<string, unknown>): Promise<string> {
  const { propertyId } = input as { propertyId: string };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const byYear: Record<number, { records: (RentRecord & { monthName: string })[]; totalCollected: number; totalDue: number }> = {};
  for (const r of property.rentRecords) {
    if (!byYear[r.year]) byYear[r.year] = { records: [], totalCollected: 0, totalDue: 0 };
    byYear[r.year].records.push({ ...r, monthName: MONTH_NAMES[r.month] });
    byYear[r.year].totalDue += r.amount;
    if (r.paid) byYear[r.year].totalCollected += r.amount;
  }
  return JSON.stringify({ propertyName: property.propertyName, currency: property.currency, years: byYear }, null, 2);
}

// ---------------------------------------------------------------------------
// Utilities tools
// ---------------------------------------------------------------------------

function sumUtilities(u: UtilitiesRecord["utilities"]): number {
  return (u.electricity ?? 0) + (u.water ?? 0) + (u.gas ?? 0) + (u.internet ?? 0) + (u.trash ?? 0);
}

async function utilitiesAddRecord(input: Record<string, unknown>): Promise<string> {
  const {
    propertyId,
    year = currentYear(),
    month = currentMonth(),
    utilities,
    paid,
    paidDate,
    notes,
  } = input as {
    propertyId: string;
    year?: number;
    month?: number;
    utilities: UtilitiesRecord["utilities"];
    paid: boolean;
    paidDate?: string;
    notes?: string;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const exists = property.utilitiesRecords.find((r) => r.year === year && r.month === month);
  if (exists)
    return `Error: A utilities record for ${MONTH_NAMES[month]} ${year} already exists on '${property.propertyName}'. Use utilities_update_record to modify it.`;

  const record: UtilitiesRecord = { year, month, utilities, paid, paidDate, notes };
  property.utilitiesRecords.push(record);
  property.utilitiesRecords.sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Utilities record for ${MONTH_NAMES[month]} ${year} added to '${property.propertyName}'. Total: ${fmt(sumUtilities(utilities))}\n\n${JSON.stringify(record, null, 2)}`;
}

async function utilitiesUpdateRecord(input: Record<string, unknown>): Promise<string> {
  const {
    propertyId,
    year = currentYear(),
    month = currentMonth(),
    paid,
    paidDate,
    utilities,
    notes,
  } = input as {
    propertyId: string;
    year?: number;
    month?: number;
    paid?: boolean;
    paidDate?: string;
    utilities?: UtilitiesRecord["utilities"];
    notes?: string;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const record = property.utilitiesRecords.find((r) => r.year === year && r.month === month);
  if (!record)
    return `Error: No utilities record for ${MONTH_NAMES[month]} ${year} on '${property.propertyName}'.`;

  if (paid !== undefined) record.paid = paid;
  if (paidDate !== undefined) record.paidDate = paidDate;
  if (utilities !== undefined) record.utilities = utilities;
  if (notes !== undefined) record.notes = notes;
  property.updatedAt = new Date().toISOString();
  await saveProperty(property);
  return `Utilities record for ${MONTH_NAMES[month]} ${year} updated on '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}`;
}

async function utilitiesListByYear(input: Record<string, unknown>): Promise<string> {
  const { propertyId, year = currentYear() } = input as {
    propertyId: string;
    year?: number;
  };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const records = property.utilitiesRecords
    .filter((r) => r.year === year)
    .sort((a, b) => a.month - b.month)
    .map((r) => ({ ...r, monthName: MONTH_NAMES[r.month], monthlyTotal: sumUtilities(r.utilities) }));

  const totalDue = records.reduce((s, r) => s + r.monthlyTotal, 0);
  const totalCollected = records.filter((r) => r.paid).reduce((s, r) => s + r.monthlyTotal, 0);
  return JSON.stringify({
    propertyName: property.propertyName,
    year,
    currency: property.currency,
    records,
    totalDue,
    totalCollected,
  }, null, 2);
}

async function utilitiesListAll(input: Record<string, unknown>): Promise<string> {
  const { propertyId } = input as { propertyId: string };
  const property = await getPropertyById(propertyId);
  if (!property) return `Error: Property '${propertyId}' not found.`;

  const byYear: Record<number, { records: unknown[]; totalDue: number; totalCollected: number }> = {};
  for (const r of property.utilitiesRecords) {
    if (!byYear[r.year]) byYear[r.year] = { records: [], totalDue: 0, totalCollected: 0 };
    const monthlyTotal = sumUtilities(r.utilities);
    byYear[r.year].records.push({ ...r, monthName: MONTH_NAMES[r.month], monthlyTotal });
    byYear[r.year].totalDue += monthlyTotal;
    if (r.paid) byYear[r.year].totalCollected += monthlyTotal;
  }
  return JSON.stringify({ propertyName: property.propertyName, currency: property.currency, years: byYear }, null, 2);
}
