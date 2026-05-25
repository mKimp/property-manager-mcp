import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import {
  getAllProperties,
  getPropertyById,
  saveProperty,
  deleteProperty,
} from "./services/db.js";
import {
  AddPropertyInputShape,
  UpdatePropertyInputShape,
  SearchPropertiesInputShape,
  AddRepairInputShape,
  AddRentRecordInputShape,
  UpdateRentRecordInputShape,
  AddUtilitiesRecordInputShape,
  UpdateUtilitiesRecordInputShape,
} from "./schemas/index.js";
import { Property, RentRecord, UtilitiesRecord } from "./types.js";

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

export const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a route handler so any thrown error becomes a 500 JSON response. */
function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

/** Validate request body against a Zod object shape. Returns parsed data or sends 400. */
function parseBody<T extends z.ZodRawShape>(
  res: Response,
  body: unknown,
  shape: T
): z.infer<z.ZodObject<T>> | null {
  const result = z.object(shape).safeParse(body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten().fieldErrors });
    return null;
  }
  return result.data;
}

/** Named route params are always strings; this cast appeases Express 5 types. */
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

// GET /api/properties — list all
app.get(
  "/api/properties",
  asyncHandler(async (_req, res) => {
    const properties = await getAllProperties();
    res.json(properties);
  })
);

// GET /api/properties/search — search by city/state/name/street/tenant
app.get(
  "/api/properties/search",
  asyncHandler(async (req, res) => {
    const { city, state, propertyName, tenantName, street } = req.query as Record<string, string | undefined>;
    const properties = await getAllProperties();
    const matches = properties.filter((p) => {
      if (city && !p.address.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (state && !p.address.state.toLowerCase().includes(state.toLowerCase())) return false;
      if (propertyName && !p.propertyName.toLowerCase().includes(propertyName.toLowerCase())) return false;
      if (street && !p.address.street.toLowerCase().includes(street.toLowerCase())) return false;
      if (tenantName && !p.tenants.some((t) => t.name.toLowerCase().includes(tenantName.toLowerCase()))) return false;
      return true;
    });
    res.json(matches);
  })
);

// GET /api/properties/:id — get one
app.get(
  "/api/properties/:id",
  asyncHandler(async (req, res) => {
    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }
    res.json(property);
  })
);

// POST /api/properties — add
app.post(
  "/api/properties",
  asyncHandler(async (req, res) => {
    const data = parseBody(res, req.body, AddPropertyInputShape);
    if (!data) return;

    const now = new Date().toISOString();
    const property: Property = {
      id: uuidv4(),
      propertyName: data.propertyName,
      address: data.address,
      rent: data.rent,
      currency: data.currency ?? "USD",
      tenants: data.tenants,
      leaseStart: data.leaseStart,
      leaseEnd: data.leaseEnd,
      propertyManager: data.propertyManager,
      notes: data.notes,
      repairs: [],
      rentRecords: [],
      createdAt: now,
      updatedAt: now,
      mortgage: data.mortgage
        ? { ...data.mortgage, monthlyPayment: data.mortgage.monthlyPayment ?? 0 }
        : undefined,
      propertyTax: data.propertyTax ?? 0,
      utilitiesRecords: [],
    };
    await saveProperty(property);
    res.status(201).json(property);
  })
);

// PATCH /api/properties/:id — update
app.patch(
  "/api/properties/:id",
  asyncHandler(async (req, res) => {
    const data = parseBody(res, { ...req.body, propertyId: p(req.params.id) }, UpdatePropertyInputShape);
    if (!data) return;

    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const { propertyName, address, rent, currency, tenants, leaseStart, leaseEnd, propertyManager, notes, mortgage, propertyTax } = data;
    if (address) property.address = { ...property.address, ...address };
    if (propertyName !== undefined) property.propertyName = propertyName;
    if (rent !== undefined) property.rent = rent;
    if (currency !== undefined) property.currency = currency;
    if (tenants !== undefined) property.tenants = tenants;
    if (leaseStart !== undefined) property.leaseStart = leaseStart;
    if (leaseEnd !== undefined) property.leaseEnd = leaseEnd;
    if (propertyManager !== undefined) property.propertyManager = propertyManager;
    if (notes !== undefined) property.notes = notes;
    if (mortgage !== undefined) {
      property.mortgage = {
        ...property.mortgage,
        ...mortgage,
        monthlyPayment: mortgage.monthlyPayment ?? property.mortgage?.monthlyPayment ?? 0,
      };
    }
    if (propertyTax !== undefined) property.propertyTax = propertyTax;

    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.json(property);
  })
);

// DELETE /api/properties/:id — delete (pass ?dryRun=true to preview)
app.delete(
  "/api/properties/:id",
  asyncHandler(async (req, res) => {
    const dryRun = req.query.dryRun === "true";
    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const summary = {
      id: property.id,
      propertyName: property.propertyName,
      address: property.address,
      repairCount: property.repairs.length,
      rentRecordCount: property.rentRecords.length,
      totalRepairCost: property.repairs.reduce((sum, r) => sum + r.amount, 0),
    };

    if (dryRun) {
      res.json({ dryRun: true, willDelete: summary });
      return;
    }

    await deleteProperty(p(req.params.id));
    res.status(204).send();
  })
);

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------

// GET /api/properties/:id/repairs — list all, or ?year=N for one year
app.get(
  "/api/properties/:id/repairs",
  asyncHandler(async (req, res) => {
    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const yearParam = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    let repairs = [...property.repairs].sort((a, b) => b.date.localeCompare(a.date));
    if (yearParam !== undefined) {
      repairs = repairs.filter((r) => r.year === yearParam);
    }
    const total = repairs.reduce((sum, r) => sum + r.amount, 0);
    res.json({ repairs, total, currency: property.currency });
  })
);

// POST /api/properties/:id/repairs — add repair
app.post(
  "/api/properties/:id/repairs",
  asyncHandler(async (req, res) => {
    const bodyShape = {
      description: AddRepairInputShape.description,
      amount: AddRepairInputShape.amount,
      date: AddRepairInputShape.date,
      vendor: AddRepairInputShape.vendor,
      notes: AddRepairInputShape.notes,
    };
    const data = parseBody(res, req.body, bodyShape);
    if (!data) return;

    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const year = parseInt(data.date.substring(0, 4), 10);
    const newRepair = {
      id: uuidv4(),
      description: data.description,
      amount: data.amount,
      date: data.date,
      year,
      ...(data.vendor !== undefined ? { vendor: data.vendor } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    };
    property.repairs.push(newRepair);
    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.status(201).json(newRepair);
  })
);

// DELETE /api/properties/:id/repairs/:repairId — delete repair
app.delete(
  "/api/properties/:id/repairs/:repairId",
  asyncHandler(async (req, res) => {
    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const index = property.repairs.findIndex((r) => r.id === p(req.params.repairId));
    if (index === -1) {
      res.status(404).json({
        error: `Repair '${p(req.params.repairId)}' not found on property '${property.propertyName}'.`,
      });
      return;
    }

    property.repairs.splice(index, 1);
    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.status(204).send();
  })
);

// ---------------------------------------------------------------------------
// Rent records
// ---------------------------------------------------------------------------

// GET /api/properties/:id/rent — list all, or ?year=N for one year
app.get(
  "/api/properties/:id/rent",
  asyncHandler(async (req, res) => {
    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const yearParam = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    if (yearParam !== undefined) {
      // Year view: totals + collection rate
      const records = property.rentRecords
        .filter((r) => r.year === yearParam)
        .sort((a, b) => a.month - b.month);
      const totalCollected = records.filter((r) => r.paid).reduce((sum, r) => sum + r.amount, 0);
      const totalDue = records.reduce((sum, r) => sum + r.amount, 0);
      const unpaidMonths = records.filter((r) => !r.paid).map((r) => MONTH_NAMES[r.month]);
      res.json({
        year: yearParam,
        currency: property.currency,
        records: records.map((r) => ({ ...r, monthName: MONTH_NAMES[r.month] })),
        totalCollected,
        totalDue,
        unpaidMonths,
        collectionRate: totalDue > 0 ? `${Math.round((totalCollected / totalDue) * 100)}%` : "N/A",
      });
      return;
    }

    // All years grouped
    const byYear: Record<number, { records: (RentRecord & { monthName: string })[]; totalCollected: number; totalDue: number }> = {};
    for (const record of property.rentRecords) {
      if (!byYear[record.year]) byYear[record.year] = { records: [], totalCollected: 0, totalDue: 0 };
      byYear[record.year].records.push({ ...record, monthName: MONTH_NAMES[record.month] });
      byYear[record.year].totalDue += record.amount;
      if (record.paid) byYear[record.year].totalCollected += record.amount;
    }
    res.json({ currency: property.currency, years: byYear });
  })
);

// POST /api/properties/:id/rent — add rent record
app.post(
  "/api/properties/:id/rent",
  asyncHandler(async (req, res) => {
    const bodyShape = {
      year: AddRentRecordInputShape.year,
      month: AddRentRecordInputShape.month,
      amount: AddRentRecordInputShape.amount,
      paid: AddRentRecordInputShape.paid,
      paidDate: AddRentRecordInputShape.paidDate,
      notes: AddRentRecordInputShape.notes,
    };
    const data = parseBody(res, req.body, bodyShape);
    if (!data) return;

    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const exists = property.rentRecords.find((r) => r.year === data.year && r.month === data.month);
    if (exists) {
      res.status(409).json({
        error: `A rent record for ${MONTH_NAMES[data.month]} ${data.year} already exists. Use PATCH to update it.`,
      });
      return;
    }

    const record: RentRecord = {
      year: data.year,
      month: data.month,
      amount: data.amount,
      paid: data.paid,
      paidDate: data.paidDate,
      notes: data.notes,
    };
    property.rentRecords.push(record);
    property.rentRecords.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.status(201).json(record);
  })
);

// PATCH /api/properties/:id/rent/:year/:month — update rent record
app.patch(
  "/api/properties/:id/rent/:year/:month",
  asyncHandler(async (req, res) => {
    const year = parseInt(p(req.params.year), 10);
    const month = parseInt(p(req.params.month), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: "year and month must be valid integers (month: 1–12)." });
      return;
    }

    const bodyShape = {
      paid: UpdateRentRecordInputShape.paid,
      paidDate: UpdateRentRecordInputShape.paidDate,
      amount: UpdateRentRecordInputShape.amount,
      notes: UpdateRentRecordInputShape.notes,
    };
    const data = parseBody(res, req.body, bodyShape);
    if (!data) return;

    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const record = property.rentRecords.find((r) => r.year === year && r.month === month);
    if (!record) {
      res.status(404).json({
        error: `No rent record for ${MONTH_NAMES[month]} ${year} on '${property.propertyName}'.`,
      });
      return;
    }

    if (data.paid !== undefined) record.paid = data.paid;
    if (data.paidDate !== undefined) record.paidDate = data.paidDate;
    if (data.amount !== undefined) record.amount = data.amount;
    if (data.notes !== undefined) record.notes = data.notes;
    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.json(record);
  })
);

// ---------------------------------------------------------------------------
// Utilities records
// ---------------------------------------------------------------------------

// GET /api/properties/:id/utilities — list all, or ?year=N for one year
app.get(
  "/api/properties/:id/utilities",
  asyncHandler(async (req, res) => {
    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const sumUtilities = (u: UtilitiesRecord["utilities"]) =>
      (u.electricity ?? 0) + (u.water ?? 0) + (u.gas ?? 0) + (u.internet ?? 0) + (u.trash ?? 0);

    const yearParam = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    if (yearParam !== undefined) {
      const records = property.utilitiesRecords
        .filter((r) => r.year === yearParam)
        .sort((a, b) => a.month - b.month);
      const totalDue = records.reduce((sum, r) => sum + sumUtilities(r.utilities), 0);
      const totalCollected = records.filter((r) => r.paid).reduce((sum, r) => sum + sumUtilities(r.utilities), 0);
      const unpaidMonths = records.filter((r) => !r.paid).map((r) => MONTH_NAMES[r.month] || `Month ${r.month}`);
      res.json({
        year: yearParam,
        currency: property.currency,
        records: records.map((r) => ({
          ...r,
          monthName: MONTH_NAMES[r.month] || `Month ${r.month}`,
          monthlyTotal: sumUtilities(r.utilities),
        })),
        totalCollected,
        totalDue,
        unpaidMonths,
        collectionRate: totalDue > 0 ? `${Math.round((totalCollected / totalDue) * 100)}%` : "0%",
      });
      return;
    }

    // All years grouped
    const byYear: Record<number, {
      records: (UtilitiesRecord & { monthName: string; monthlyTotal: number })[];
      totalCollected: number;
      totalDue: number;
    }> = {};
    const sorted = [...property.utilitiesRecords].sort((a, b) =>
      a.year !== b.year ? a.year - b.year : a.month - b.month
    );
    for (const record of sorted) {
      if (!byYear[record.year]) byYear[record.year] = { records: [], totalCollected: 0, totalDue: 0 };
      const monthlyTotal = sumUtilities(record.utilities);
      byYear[record.year].records.push({
        ...record,
        monthName: MONTH_NAMES[record.month] || `Month ${record.month}`,
        monthlyTotal,
      });
      byYear[record.year].totalDue += monthlyTotal;
      if (record.paid) byYear[record.year].totalCollected += monthlyTotal;
    }
    res.json({ currency: property.currency, years: byYear });
  })
);

// POST /api/properties/:id/utilities — add utilities record
app.post(
  "/api/properties/:id/utilities",
  asyncHandler(async (req, res) => {
    const now = new Date();
    const bodyShape = {
      year: AddUtilitiesRecordInputShape.year,
      month: AddUtilitiesRecordInputShape.month,
      utilities: AddUtilitiesRecordInputShape.utilities,
      paid: AddUtilitiesRecordInputShape.paid,
      paidDate: AddUtilitiesRecordInputShape.paidDate,
      notes: AddUtilitiesRecordInputShape.notes,
    };
    const data = parseBody(res, req.body, bodyShape);
    if (!data) return;

    const year = data.year ?? now.getFullYear();
    const month = data.month ?? (now.getMonth() + 1);

    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const exists = property.utilitiesRecords.find((r) => r.year === year && r.month === month);
    if (exists) {
      res.status(409).json({
        error: `A utilities record for ${MONTH_NAMES[month]} ${year} already exists. Use PATCH to update it.`,
      });
      return;
    }

    const record: UtilitiesRecord = {
      year,
      month,
      utilities: data.utilities,
      paid: data.paid,
      paidDate: data.paidDate,
      notes: data.notes,
    };
    property.utilitiesRecords.push(record);
    property.utilitiesRecords.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.status(201).json(record);
  })
);

// PATCH /api/properties/:id/utilities/:year/:month — update utilities record
app.patch(
  "/api/properties/:id/utilities/:year/:month",
  asyncHandler(async (req, res) => {
    const year = parseInt(p(req.params.year), 10);
    const month = parseInt(p(req.params.month), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ error: "year and month must be valid integers (month: 1–12)." });
      return;
    }

    const bodyShape = {
      paid: UpdateUtilitiesRecordInputShape.paid,
      paidDate: UpdateUtilitiesRecordInputShape.paidDate,
      utilities: UpdateUtilitiesRecordInputShape.utilities,
      notes: UpdateUtilitiesRecordInputShape.notes,
    };
    const data = parseBody(res, req.body, bodyShape);
    if (!data) return;

    const property = await getPropertyById(p(req.params.id));
    if (!property) {
      res.status(404).json({ error: `Property '${p(req.params.id)}' not found.` });
      return;
    }

    const record = property.utilitiesRecords.find((r) => r.year === year && r.month === month);
    if (!record) {
      res.status(404).json({
        error: `No utilities record for ${MONTH_NAMES[month]} ${year} on '${property.propertyName}'.`,
      });
      return;
    }

    if (data.paid !== undefined) record.paid = data.paid;
    if (data.paidDate !== undefined) record.paidDate = data.paidDate;
    if (data.utilities !== undefined) record.utilities = data.utilities;
    if (data.notes !== undefined) record.notes = data.notes;
    property.updatedAt = new Date().toISOString();
    await saveProperty(property);
    res.json(record);
  })
);

// ---------------------------------------------------------------------------
// Chat — mock SSE endpoint (Phase 2a)
// TODO Phase 2c: replace mockReply + streaming loop with real Claude API
//               call + tool executor. Wire format stays identical so the
//               frontend never needs to change.
// ---------------------------------------------------------------------------

const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1),
});

/**
 * Encode a text fragment as one SSE event.
 * JSON-wrapped so newlines and special characters survive without escaping.
 * Wire format: data: {"t":"<text>"}\n\n
 */
function sseChunk(text: string): string {
  return `data: ${JSON.stringify({ t: text })}\n\n`;
}

const SSE_DONE = "data: [DONE]\n\n";

/**
 * Delay between chunks — 0 ms in test env so the suite stays fast,
 * 20 ms in dev/prod so streaming looks natural in the UI.
 */
const STREAM_DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 20;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Pick a hardcoded markdown reply based on simple keyword matching.
 * Exercises: plain text, tables, bullet lists, bold, italic.
 */
function mockReply(lastUserMessage: string): string {
  const q = lastUserMessage.toLowerCase();

  if (q.includes("kent")) {
    return (
      "Here's the rent status for **Kent House** (22902 112th Pl SE, Kent WA):\n\n" +
      "| Month | Amount | Status |\n" +
      "|-------|--------|--------|\n" +
      "| Feb 2026 | $4,100 | ✅ Paid |\n" +
      "| Mar 2026 | $4,100 | ✅ Paid |\n" +
      "| Apr 2026 | $4,100 | ✅ Paid |\n" +
      "| May 2026 | $4,100 | ⏳ Unpaid |\n\n" +
      "Collection rate: **75%** for 2026. Monthly mortgage: $2,822.81."
    );
  }

  if (q.includes("portland")) {
    return (
      "**Portland House** — 13891 SE Rogers Ln, Clackamas OR 97015\n\n" +
      "Managed by Breakwater Northwest. Lease: Oct 28 2023 – Oct 31 2026. " +
      "Monthly rent: **$2,770**. No rent records logged yet.\n\n" +
      "Repair on file: fence repair $950 (Apr 1 2026)."
    );
  }

  if (q.includes("seattle")) {
    return (
      "**Seattle Single House** — 9343 48th Ave S, Seattle WA 98118\n\n" +
      "Tenants: Thao Nguyen and Dat Duong. Lease: Sep 1 2025 – Aug 31 2026. " +
      "Monthly rent: **$1,800**.\n\n" +
      "_Notes: two cats, shared water & electricity, tenant pays internet. No smoking._"
    );
  }

  if (q.includes("repair") || q.includes("expense")) {
    return (
      "Repair expenses for 2026:\n\n" +
      "- **Portland House** — Fence repair: $950.00 (Apr 1)\n" +
      "- **Kent House** — Blockage drainage repair: $2,989.35 (Apr 13)\n" +
      "- **Kent House** — New refrigerator: $370.00 (Apr 1)\n\n" +
      "**Total 2026 repairs: $4,309.35**"
    );
  }

  if (q.includes("utilit")) {
    return (
      "Utilities for **Kent House** in 2026:\n\n" +
      "| Month | Electricity | Water | Total | Paid |\n" +
      "|-------|-------------|-------|-------|------|\n" +
      "| Jan | $57.92 | $39.70 | $97.62 | ✅ |\n" +
      "| Feb | $405.18 | $15.41 | $420.59 | ✅ |\n\n" +
      "No utilities logged for other properties yet. Want me to add one?"
    );
  }

  if (q.includes("rent")) {
    return (
      "I can help with rent records! Try:\n\n" +
      '- *"Mark Kent House rent as paid for May 2026"*\n' +
      '- *"Add a rent record for Seattle House for June"*\n' +
      '- *"Show me Kent House rent for 2026"*\n\n' +
      "Which property and month?"
    );
  }

  if (
    q.includes("list") ||
    q.includes("all") ||
    q.includes("properties") ||
    q.includes("portfolio")
  ) {
    return (
      "You have **4 properties** in the portfolio:\n\n" +
      "| Property | Location | Rent | Tenant(s) |\n" +
      "|----------|----------|------|-----------|\n" +
      "| Portland House | Clackamas, OR | $2,770 | — |\n" +
      "| Seattle Single House | Seattle, WA | $1,800 | Thao + Dat |\n" +
      "| Kent House | Kent, WA | $4,100 | Ramon |\n" +
      "| Test Property | San Jose, CA | $1,000 | — |\n\n" +
      "Total monthly rent: **$9,670**"
    );
  }

  // Default — help menu
  return (
    "Hi! I'm your property management assistant 🏠\n\n" +
    "Here's what I can help with:\n\n" +
    '- **View portfolio** — *"show all properties"*\n' +
    '- **Property details** — *"tell me about Kent House"*\n' +
    '- **Rent tracking** — *"mark Kent House rent paid for May"*\n' +
    '- **Repairs** — *"show all repair expenses for 2026"*\n' +
    '- **Utilities** — *"add utilities for Kent House this month"*\n\n' +
    "What would you like to do?"
  );
}

// POST /api/chat — mock streaming chat
app.post(
  "/api/chat",
  asyncHandler(async (req, res) => {
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }

    const { messages } = parsed.data;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const reply = mockReply(lastUser?.content ?? "");

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // prevent nginx buffering in prod
    res.flushHeaders();

    // Stream reply in 5-character chunks to simulate token drip
    const CHUNK = 5;
    for (let i = 0; i < reply.length; i += CHUNK) {
      res.write(sseChunk(reply.slice(i, i + CHUNK)));
      if (STREAM_DELAY_MS > 0) await sleep(STREAM_DELAY_MS);
    }

    res.write(SSE_DONE);
    res.end();
  })
);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use(
  (
    err: Error & { status?: number; statusCode?: number },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    // body-parser and other middleware attach a 4xx status — honour it.
    const status = err.status ?? err.statusCode ?? 500;
    if (status >= 500) console.error("Unhandled error:", err);
    res
      .status(status)
      .json({ error: status < 500 ? err.message : "Internal server error." });
  }
);

// ---------------------------------------------------------------------------
// Start server (only when run directly, not when imported by tests)
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? "3001", 10);

export function startServer(): void {
  app.listen(PORT, () => {
    console.log(`Express API listening on port ${PORT}`);
  });
}
