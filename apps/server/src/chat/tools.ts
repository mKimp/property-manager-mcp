/**
 * Anthropic Tool definitions for all 18 MCP tools.
 * Converted from the existing Zod schemas in src/schemas/index.ts.
 *
 * cache_control is NOT placed here — a breakpoint on the last system prompt
 * block caches tools + system together (render order: tools → system → messages).
 */
import type Anthropic from "@anthropic-ai/sdk";

const addressProperties = {
  street: { type: "string", description: "Street address (e.g., '123 Main St')" },
  city: { type: "string", description: "City name" },
  state: { type: "string", description: "State or province code (e.g., 'WA')" },
  zip: { type: "string", description: "ZIP or postal code" },
  country: { type: "string", description: "Country code (default: 'US')" },
} as const;

const mortgageProperties = {
  lender: { type: "string", description: "Mortgage lender name" },
  monthlyPayment: { type: "number", description: "Monthly mortgage payment" },
  interestRate: { type: "number", description: "Mortgage interest rate (%)" },
  termYears: { type: "number", description: "Mortgage term in years" },
  startDate: { type: "string", description: "Mortgage start date YYYY-MM-DD" },
} as const;

const utilitiesBreakdown = {
  type: "object",
  description: "Utility costs for the month",
  properties: {
    electricity: { type: "number", description: "Electricity cost" },
    water: { type: "number", description: "Water cost" },
    gas: { type: "number", description: "Gas cost" },
    internet: { type: "number", description: "Internet cost" },
    trash: { type: "number", description: "Trash collection cost" },
  },
} as const;

export const TOOLS: Anthropic.Tool[] = [
  // ── Properties ─────────────────────────────────────────────────────────────
  {
    name: "property_list_all",
    description:
      "List all properties in the portfolio with summaries (id, name, address, rent, tenants, repair/rent record counts).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "property_get",
    description: "Get full details of a single property including all repairs, rent records, and utilities.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "Unique property ID" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "property_search",
    description:
      "Search properties by city, state, property name, tenant name, or street (case-insensitive partial match). " +
      "Use this to find a propertyId when the user refers to a property by name.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Filter by city (partial match)" },
        state: { type: "string", description: "Filter by state code" },
        propertyName: { type: "string", description: "Filter by property name (partial match)" },
        tenantName: { type: "string", description: "Filter by tenant name (partial match)" },
        street: { type: "string", description: "Filter by street address (partial match)" },
      },
      required: [],
    },
  },
  {
    name: "property_add",
    description: "Add a new rental property to the portfolio.",
    input_schema: {
      type: "object",
      properties: {
        propertyName: { type: "string", description: "Display name (e.g., 'Seattle Condo')" },
        address: {
          type: "object",
          description: "Full address",
          properties: addressProperties,
          required: ["street", "city", "state", "zip"],
        },
        rent: { type: "number", description: "Monthly rent amount" },
        currency: { type: "string", description: "3-letter currency code (default: 'USD')" },
        tenants: {
          type: "array",
          description: "List of current tenants",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
            },
            required: ["name"],
          },
        },
        leaseStart: { type: "string", description: "Lease start date YYYY-MM-DD" },
        leaseEnd: { type: "string", description: "Lease end date YYYY-MM-DD" },
        propertyManager: { type: "string", description: "Property manager name" },
        notes: { type: "string", description: "General notes" },
        mortgage: {
          type: "object",
          description: "Mortgage details",
          properties: mortgageProperties,
        },
        propertyTax: { type: "number", description: "Annual property tax" },
      },
      required: ["propertyName", "address", "rent", "tenants"],
    },
  },
  {
    name: "property_update",
    description: "Update fields on an existing property (partial update — only send fields to change).",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "ID of the property to update" },
        propertyName: { type: "string" },
        address: {
          type: "object",
          description: "Address fields to update (partial)",
          properties: addressProperties,
        },
        rent: { type: "number" },
        currency: { type: "string" },
        tenants: { type: "array", description: "Replaces entire tenant list", items: { type: "object" } },
        leaseStart: { type: "string" },
        leaseEnd: { type: "string" },
        propertyManager: { type: "string" },
        notes: { type: "string" },
        mortgage: { type: "object", properties: mortgageProperties },
        propertyTax: { type: "number" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "property_delete",
    description:
      "Delete a property. Always call with dryRun=true first so the user can confirm what will be removed.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "ID of the property to delete" },
        dryRun: {
          type: "boolean",
          description: "If true, preview what would be deleted without deleting. Default: false.",
        },
      },
      required: ["propertyId"],
    },
  },

  // ── Repairs ────────────────────────────────────────────────────────────────
  {
    name: "repair_add",
    description: "Add a repair or maintenance expense to a property.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        description: { type: "string", description: "Description of the repair" },
        amount: { type: "number", description: "Cost in the property's currency" },
        date: { type: "string", description: "Date of expense YYYY-MM-DD" },
        vendor: { type: "string", description: "Vendor or contractor name" },
        notes: { type: "string" },
      },
      required: ["propertyId", "description", "amount", "date"],
    },
  },
  {
    name: "repair_delete",
    description: "Delete a repair expense from a property.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        repairId: { type: "string", description: "ID of the repair to delete" },
      },
      required: ["propertyId", "repairId"],
    },
  },
  {
    name: "repair_list",
    description: "List all repair expenses for a property across all years, sorted newest first.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "repair_list_by_year",
    description: "List repair expenses for a property in a specific year with total cost.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number", description: "Year to retrieve (e.g., 2026)" },
      },
      required: ["propertyId", "year"],
    },
  },

  // ── Rent ───────────────────────────────────────────────────────────────────
  {
    name: "rent_add_record",
    description: "Add a monthly rent record to track whether rent was paid.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number", description: "Year (e.g., 2026)" },
        month: { type: "number", description: "Month 1-12" },
        amount: { type: "number", description: "Rent amount" },
        paid: { type: "boolean", description: "Whether rent has been paid" },
        paidDate: { type: "string", description: "Date payment received YYYY-MM-DD" },
        notes: { type: "string" },
      },
      required: ["propertyId", "year", "month", "amount", "paid"],
    },
  },
  {
    name: "rent_update_record",
    description: "Update an existing rent record (e.g., mark as paid, update amount).",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number" },
        month: { type: "number", description: "Month 1-12" },
        paid: { type: "boolean" },
        paidDate: { type: "string", description: "Date payment received YYYY-MM-DD" },
        amount: { type: "number" },
        notes: { type: "string" },
      },
      required: ["propertyId", "year", "month"],
    },
  },
  {
    name: "rent_list_by_year",
    description: "Get all rent records for a property in a specific year with totals and collection rate.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number" },
      },
      required: ["propertyId", "year"],
    },
  },
  {
    name: "rent_list_all",
    description: "Get all rent records for a property grouped by year.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
      },
      required: ["propertyId"],
    },
  },

  // ── Utilities ──────────────────────────────────────────────────────────────
  {
    name: "utilities_add_record",
    description:
      "Add a monthly utilities record (electricity, water, gas, internet, trash). " +
      "Omit year/month to default to the current month.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number", description: "Year (defaults to current year)" },
        month: { type: "number", description: "Month 1-12 (defaults to current month)" },
        utilities: utilitiesBreakdown,
        paid: { type: "boolean", description: "Whether utilities have been paid" },
        paidDate: { type: "string", description: "Date payment received YYYY-MM-DD" },
        notes: { type: "string" },
      },
      required: ["propertyId", "utilities", "paid"],
    },
  },
  {
    name: "utilities_update_record",
    description: "Update an existing utilities record. Omit year/month to default to current month.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number", description: "Year (defaults to current year)" },
        month: { type: "number", description: "Month 1-12 (defaults to current month)" },
        paid: { type: "boolean" },
        paidDate: { type: "string" },
        utilities: utilitiesBreakdown,
        notes: { type: "string" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "utilities_list_by_year",
    description: "Get all utility records for a property in a specific year. Omit year for current year.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
        year: { type: "number", description: "Year (defaults to current year)" },
      },
      required: ["propertyId"],
    },
  },
  {
    name: "utilities_list_all",
    description: "Get all utility records for a property grouped by year.",
    input_schema: {
      type: "object",
      properties: {
        propertyId: { type: "string" },
      },
      required: ["propertyId"],
    },
  },
];
