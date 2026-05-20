import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AddRentRecordInputShape,
  UpdateRentRecordInputShape,
  PropertyIdInputShape,
  GetRentByYearInputShape,
} from "../schemas/index.js";
import { getPropertyById, saveProperty } from "../services/storage.js";
import { RentRecord } from "../types.js";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function registerRentTools(server: McpServer): void {

  // ADD RENT RECORD
  server.registerTool(
    "rent_add_record",
    {
      title: "Add Rent Record",
      description: `Add a monthly rent record to a property to track rent collection.

Args:
  - propertyId (string): ID of the property
  - year (number): Year (e.g., 2024)
  - month (number): Month 1-12
  - amount (number): Rent amount
  - paid (boolean): Whether rent was paid
  - paidDate (string, optional): Date payment received YYYY-MM-DD
  - notes (string, optional)

Returns: The newly added rent record.`,
      inputSchema: AddRentRecordInputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ propertyId, year, month, amount, paid, paidDate, notes }) => {
      const property = getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const exists = property.rentRecords.find((r) => r.year === year && r.month === month);
      if (exists) {
        return {
          content: [{ type: "text" as const, text: `Error: A rent record for ${MONTH_NAMES[month]} ${year} already exists. Use rent_update_record to modify it.` }],
        };
      }
      const record: RentRecord = { year, month, amount, paid, paidDate, notes };
      property.rentRecords.push(record);
      property.rentRecords.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
      property.updatedAt = new Date().toISOString();
      saveProperty(property);
      return {
        content: [{ type: "text" as const, text: `Rent record for ${MONTH_NAMES[month]} ${year} added to '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}` }],
      };
    }
  );

  // UPDATE RENT RECORD
  server.registerTool(
    "rent_update_record",
    {
      title: "Update Rent Record",
      description: `Update an existing monthly rent record (e.g., mark as paid, update amount).

Args:
  - propertyId (string): ID of the property
  - year (number): Year of the record
  - month (number): Month 1-12
  - paid (boolean, optional): Update paid status
  - paidDate (string, optional): Date payment received YYYY-MM-DD
  - amount (number, optional): Updated rent amount
  - notes (string, optional)

Returns: The updated rent record.`,
      inputSchema: UpdateRentRecordInputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId, year, month, paid, paidDate, amount, notes }) => {
      const property = getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const record = property.rentRecords.find((r) => r.year === year && r.month === month);
      if (!record) {
        return {
          content: [{ type: "text" as const, text: `Error: No rent record found for ${MONTH_NAMES[month]} ${year} on '${property.propertyName}'.` }],
        };
      }
      if (paid !== undefined) record.paid = paid;
      if (paidDate !== undefined) record.paidDate = paidDate;
      if (amount !== undefined) record.amount = amount;
      if (notes !== undefined) record.notes = notes;
      property.updatedAt = new Date().toISOString();
      saveProperty(property);
      return {
        content: [{ type: "text" as const, text: `Rent record for ${MONTH_NAMES[month]} ${year} updated on '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}` }],
      };
    }
  );

  // GET RENT RECORDS BY YEAR
  server.registerTool(
    "rent_list_by_year",
    {
      title: "List Rent Records by Year",
      description: `Get all rent records for a property in a specific year, with totals and payment summary.

Args:
  - propertyId (string): ID of the property
  - year (number): Year to retrieve (e.g., 2024)

Returns: Monthly rent records with totalCollected, totalDue, unpaidMonths, and collectionRate.`,
      inputSchema: GetRentByYearInputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId, year }) => {
      const property = getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const records = property.rentRecords
        .filter((r) => r.year === year)
        .sort((a, b) => a.month - b.month);
      const totalCollected = records.filter((r) => r.paid).reduce((sum, r) => sum + r.amount, 0);
      const totalDue = records.reduce((sum, r) => sum + r.amount, 0);
      const unpaidMonths = records.filter((r) => !r.paid).map((r) => MONTH_NAMES[r.month]);
      const result = {
        propertyName: property.propertyName,
        year,
        currency: property.currency,
        records: records.map((r) => ({ ...r, monthName: MONTH_NAMES[r.month] })),
        totalCollected,
        totalDue,
        unpaidMonths,
        collectionRate: totalDue > 0 ? `${Math.round((totalCollected / totalDue) * 100)}%` : "N/A",
      };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // LIST ALL RENT RECORDS
  server.registerTool(
    "rent_list_all",
    {
      title: "List All Rent Records",
      description: `Get all rent records for a property across all years, grouped by year with annual totals.

Args:
  - propertyId (string): ID of the property

Returns: All rent records grouped by year with annual collected/due totals.`,
      inputSchema: PropertyIdInputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId }) => {
      const property = getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const byYear: Record<number, { records: (RentRecord & { monthName: string })[]; totalCollected: number; totalDue: number }> = {};
      for (const record of property.rentRecords) {
        if (!byYear[record.year]) {
          byYear[record.year] = { records: [], totalCollected: 0, totalDue: 0 };
        }
        byYear[record.year].records.push({ ...record, monthName: MONTH_NAMES[record.month] });
        byYear[record.year].totalDue += record.amount;
        if (record.paid) byYear[record.year].totalCollected += record.amount;
      }
      const result = { propertyName: property.propertyName, currency: property.currency, years: byYear };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}