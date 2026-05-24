import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../server.js";
import type { Property } from "../types.js";

// ---------------------------------------------------------------------------
// Mock the entire DB layer — no real Turso connections during tests
// ---------------------------------------------------------------------------

vi.mock("../services/db.js", () => ({
  getAllProperties: vi.fn(),
  getPropertyById: vi.fn(),
  saveProperty: vi.fn(),
  deleteProperty: vi.fn(),
}));

// Import mocked functions so we can configure them per test
import {
  getAllProperties,
  getPropertyById,
  saveProperty,
  deleteProperty,
} from "../services/db.js";

const mockGetAll = vi.mocked(getAllProperties);
const mockGetById = vi.mocked(getPropertyById);
const mockSave = vi.mocked(saveProperty);
const mockDelete = vi.mocked(deleteProperty);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROP_ID = "prop-001";

const baseProperty: Property = {
  id: PROP_ID,
  propertyName: "Kent House",
  address: { street: "123 Main St", city: "Kent", state: "WA", zip: "98030", country: "US" },
  rent: 1800,
  currency: "USD",
  tenants: [{ name: "Alice Smith", email: "alice@example.com" }],
  leaseStart: "2023-01-01",
  leaseEnd: "2024-12-31",
  propertyManager: undefined,
  notes: undefined,
  repairs: [
    { id: "repair-001", description: "Fix roof", amount: 500, date: "2024-03-15", year: 2024 },
  ],
  rentRecords: [
    { year: 2024, month: 1, amount: 1800, paid: true, paidDate: "2024-01-05" },
    { year: 2024, month: 2, amount: 1800, paid: false },
  ],
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2024-03-01T00:00:00.000Z",
  mortgage: { lender: "First Bank", monthlyPayment: 1200, interestRate: 4.5, termYears: 30 },
  propertyTax: 3000,
  utilitiesRecords: [
    {
      year: 2024,
      month: 1,
      utilities: { electricity: 80, water: 40, gas: 60 },
      paid: true,
      paidDate: "2024-01-10",
    },
  ],
};

// Deep-clone so individual tests can mutate without affecting others
function makeProperty(overrides: Partial<Property> = {}): Property {
  return { ...JSON.parse(JSON.stringify(baseProperty)), ...overrides };
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe("GET /health", () => {
  it("returns 200 ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe("Properties routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(true);
  });

  describe("GET /api/properties", () => {
    it("returns 200 with all properties", async () => {
      mockGetAll.mockResolvedValue([makeProperty()]);
      const res = await request(app).get("/api/properties");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(PROP_ID);
    });

    it("returns 200 with empty array when no properties", async () => {
      mockGetAll.mockResolvedValue([]);
      const res = await request(app).get("/api/properties");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/properties/search", () => {
    it("filters by city", async () => {
      mockGetAll.mockResolvedValue([makeProperty()]);
      const res = await request(app).get("/api/properties/search?city=kent");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("returns empty array for non-matching city", async () => {
      mockGetAll.mockResolvedValue([makeProperty()]);
      const res = await request(app).get("/api/properties/search?city=portland");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it("filters by tenant name", async () => {
      mockGetAll.mockResolvedValue([makeProperty()]);
      const res = await request(app).get("/api/properties/search?tenantName=alice");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });
  });

  describe("GET /api/properties/:id", () => {
    it("returns 200 with property", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(PROP_ID);
      expect(res.body.propertyName).toBe("Kent House");
    });

    it("returns 404 when not found", async () => {
      mockGetById.mockResolvedValue(null);
      const res = await request(app).get("/api/properties/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe("POST /api/properties", () => {
    const validBody = {
      propertyName: "Seattle Condo",
      address: { street: "456 Pine St", city: "Seattle", state: "WA", zip: "98101", country: "US" },
      rent: 2200,
      currency: "USD",
      tenants: [{ name: "Bob Jones" }],
    };

    it("returns 201 with new property", async () => {
      const res = await request(app).post("/api/properties").send(validBody);
      expect(res.status).toBe(201);
      expect(res.body.propertyName).toBe("Seattle Condo");
      expect(res.body.id).toBeTruthy();
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request(app).post("/api/properties").send({ propertyName: "Incomplete" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });
  });

  describe("PATCH /api/properties/:id", () => {
    it("returns 200 with updated property", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}`)
        .send({ rent: 2000, notes: "Renovated" });
      expect(res.status).toBe(200);
      expect(res.body.rent).toBe(2000);
      expect(res.body.notes).toBe("Renovated");
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 404 when property not found", async () => {
      mockGetById.mockResolvedValue(null);
      const res = await request(app).patch("/api/properties/ghost").send({ rent: 100 });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/properties/:id", () => {
    it("returns 200 dry-run preview", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).delete(`/api/properties/${PROP_ID}?dryRun=true`);
      expect(res.status).toBe(200);
      expect(res.body.dryRun).toBe(true);
      expect(res.body.willDelete.id).toBe(PROP_ID);
      expect(mockDelete).not.toHaveBeenCalled();
    });

    it("returns 204 on successful delete", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).delete(`/api/properties/${PROP_ID}`);
      expect(res.status).toBe(204);
      expect(mockDelete).toHaveBeenCalledWith(PROP_ID);
    });

    it("returns 404 when property not found", async () => {
      mockGetById.mockResolvedValue(null);
      const res = await request(app).delete("/api/properties/ghost");
      expect(res.status).toBe(404);
    });
  });
});

// ---------------------------------------------------------------------------
// Repairs
// ---------------------------------------------------------------------------

describe("Repair routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  describe("GET /api/properties/:id/repairs", () => {
    it("returns 200 with all repairs", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/repairs`);
      expect(res.status).toBe(200);
      expect(res.body.repairs).toHaveLength(1);
      expect(res.body.total).toBe(500);
    });

    it("returns 200 filtered by year", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/repairs?year=2024`);
      expect(res.status).toBe(200);
      expect(res.body.repairs).toHaveLength(1);
    });

    it("returns empty list for year with no repairs", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/repairs?year=2020`);
      expect(res.status).toBe(200);
      expect(res.body.repairs).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it("returns 404 when property not found", async () => {
      mockGetById.mockResolvedValue(null);
      const res = await request(app).get("/api/properties/ghost/repairs");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/properties/:id/repairs", () => {
    const validRepair = { description: "Fix fence", amount: 300, date: "2024-06-01" };

    it("returns 201 with new repair", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/repairs`)
        .send(validRepair);
      expect(res.status).toBe(201);
      expect(res.body.description).toBe("Fix fence");
      expect(res.body.id).toBeTruthy();
      expect(res.body.year).toBe(2024);
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 400 for invalid body", async () => {
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/repairs`)
        .send({ description: "No amount" });
      expect(res.status).toBe(400);
    });

    it("returns 404 when property not found", async () => {
      mockGetById.mockResolvedValue(null);
      const res = await request(app)
        .post("/api/properties/ghost/repairs")
        .send(validRepair);
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/properties/:id/repairs/:repairId", () => {
    it("returns 204 on success", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).delete(`/api/properties/${PROP_ID}/repairs/repair-001`);
      expect(res.status).toBe(204);
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 404 when repair not found", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).delete(`/api/properties/${PROP_ID}/repairs/nonexistent`);
      expect(res.status).toBe(404);
    });
  });
});

// ---------------------------------------------------------------------------
// Rent records
// ---------------------------------------------------------------------------

describe("Rent routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  describe("GET /api/properties/:id/rent", () => {
    it("returns 200 with all years grouped", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/rent`);
      expect(res.status).toBe(200);
      expect(res.body.years[2024]).toBeTruthy();
    });

    it("returns 200 year view with totals", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/rent?year=2024`);
      expect(res.status).toBe(200);
      expect(res.body.year).toBe(2024);
      expect(res.body.records).toHaveLength(2);
      expect(res.body.totalCollected).toBe(1800);
      expect(res.body.totalDue).toBe(3600);
      expect(res.body.collectionRate).toBe("50%");
    });

    it("returns 404 when property not found", async () => {
      mockGetById.mockResolvedValue(null);
      const res = await request(app).get("/api/properties/ghost/rent");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/properties/:id/rent", () => {
    const newRecord = { year: 2024, month: 3, amount: 1800, paid: false };

    it("returns 201 with new rent record", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/rent`)
        .send(newRecord);
      expect(res.status).toBe(201);
      expect(res.body.year).toBe(2024);
      expect(res.body.month).toBe(3);
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 409 when record already exists for that month", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      // month 1 already exists in the fixture
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/rent`)
        .send({ year: 2024, month: 1, amount: 1800, paid: false });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/rent`)
        .send({ year: 2024 });
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/properties/:id/rent/:year/:month", () => {
    it("returns 200 with updated record", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}/rent/2024/2`)
        .send({ paid: true, paidDate: "2024-02-10" });
      expect(res.status).toBe(200);
      expect(res.body.paid).toBe(true);
      expect(res.body.paidDate).toBe("2024-02-10");
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 404 when rent record not found", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}/rent/2024/6`)
        .send({ paid: true });
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid month param", async () => {
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}/rent/2024/99`)
        .send({ paid: true });
      expect(res.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// Utilities records
// ---------------------------------------------------------------------------

describe("Utilities routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
  });

  describe("GET /api/properties/:id/utilities", () => {
    it("returns 200 with all years grouped", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/utilities`);
      expect(res.status).toBe(200);
      expect(res.body.years[2024]).toBeTruthy();
    });

    it("returns 200 year view with totals", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app).get(`/api/properties/${PROP_ID}/utilities?year=2024`);
      expect(res.status).toBe(200);
      expect(res.body.year).toBe(2024);
      expect(res.body.records).toHaveLength(1);
      expect(res.body.totalDue).toBe(180); // 80+40+60
      expect(res.body.collectionRate).toBe("100%");
    });
  });

  describe("POST /api/properties/:id/utilities", () => {
    const newUtil = {
      year: 2024,
      month: 2,
      utilities: { electricity: 90, water: 45 },
      paid: false,
    };

    it("returns 201 with new utilities record", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/utilities`)
        .send(newUtil);
      expect(res.status).toBe(201);
      expect(res.body.month).toBe(2);
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 409 when record already exists for that month", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      // month 1 already exists in the fixture
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/utilities`)
        .send({ year: 2024, month: 1, utilities: { electricity: 90 }, paid: false });
      expect(res.status).toBe(409);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await request(app)
        .post(`/api/properties/${PROP_ID}/utilities`)
        .send({ year: 2024, month: 2 }); // missing utilities and paid
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/properties/:id/utilities/:year/:month", () => {
    it("returns 200 with updated record", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}/utilities/2024/1`)
        .send({ paid: true, paidDate: "2024-01-15" });
      expect(res.status).toBe(200);
      expect(res.body.paid).toBe(true);
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it("returns 404 when utilities record not found", async () => {
      mockGetById.mockResolvedValue(makeProperty());
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}/utilities/2024/6`)
        .send({ paid: true });
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid month param", async () => {
      const res = await request(app)
        .patch(`/api/properties/${PROP_ID}/utilities/2024/13`)
        .send({ paid: true });
      expect(res.status).toBe(400);
    });
  });
});
