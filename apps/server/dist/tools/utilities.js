"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUtilitiesTools = registerUtilitiesTools;
const index_js_1 = require("../schemas/index.js");
const db_js_1 = require("../services/db.js");
const MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
function registerUtilitiesTools(server) {
    // ADD UTILITIES RECORD
    server.registerTool("utilities_add_record", {
        title: "Add Utilities Record",
        description: `Add a monthly utilities record to a property to track utility expenses.

Args:
  - propertyId (string): ID of the property
  - year (number, optional): Year (e.g., 2024) — defaults to current year
  - month (number, optional): Month 1-12 — defaults to current month
  - utilities (object): Utility expenses for the month (electricity, water, gas, internet, trash)
  - paid (boolean): Whether utilities have been paid
  - paidDate (string, optional): Date payment received YYYY-MM-DD
  - notes (string, optional)

Returns: The newly added utilities record.`,
        inputSchema: index_js_1.AddUtilitiesRecordInputShape,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    }, async ({ propertyId, year: yearInput, month: monthInput, utilities, paid, paidDate, notes }) => {
        const now = new Date();
        const year = yearInput ?? now.getFullYear();
        const month = monthInput ?? (now.getMonth() + 1);
        const property = await (0, db_js_1.getPropertyById)(propertyId);
        if (!property) {
            return { content: [{ type: "text", text: `Error: Property '${propertyId}' not found.` }] };
        }
        const utilitiesRecords = property.utilitiesRecords || [];
        const exists = utilitiesRecords.find((r) => r.year === year && r.month === month);
        if (exists) {
            return {
                content: [{ type: "text", text: `Error: An utilities record for ${MONTH_NAMES[month]} ${year} already exists. Use utilities_update_record to modify it.` }],
            };
        }
        const record = { year, month, utilities, paid, paidDate, notes };
        property.utilitiesRecords.push(record);
        property.utilitiesRecords.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        property.updatedAt = new Date().toISOString();
        await (0, db_js_1.saveProperty)(property);
        return {
            content: [{ type: "text", text: `Utilities record for ${MONTH_NAMES[month]} ${year} added to '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}` }],
        };
    });
    // UPDATE UTILITIES RECORD
    server.registerTool("utilities_update_record", {
        title: "Update Utilities Record",
        description: `Update an existing monthly utilities record (e.g., mark as paid, update amount).

Args:
  - propertyId (string): ID of the property
  - year (number, optional): Year of the record — defaults to current year
  - month (number, optional): Month 1-12 — defaults to current month
  - paid (boolean, optional): Update paid status
  - paidDate (string, optional): Date payment received YYYY-MM-DD
  - utilities (object, optional): Updated utility expenses for the month (electricity, water, gas, internet, trash)
  - notes (string, optional)

Returns: The updated utilities record.`,
        inputSchema: index_js_1.UpdateUtilitiesRecordInputShape,
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ propertyId, year: yearInput, month: monthInput, paid, paidDate, utilities, notes }) => {
        const now = new Date();
        const year = yearInput ?? now.getFullYear();
        const month = monthInput ?? (now.getMonth() + 1);
        const property = await (0, db_js_1.getPropertyById)(propertyId);
        if (!property) {
            return { content: [{ type: "text", text: `Error: Property '${propertyId}' not found.` }] };
        }
        const record = property.utilitiesRecords.find((r) => r.year === year && r.month === month);
        if (!record) {
            return {
                content: [{ type: "text", text: `Error: No utilities record found for ${MONTH_NAMES[month]} ${year} on '${property.propertyName}'.` }],
            };
        }
        if (paid !== undefined)
            record.paid = paid;
        if (paidDate !== undefined)
            record.paidDate = paidDate;
        if (utilities !== undefined)
            record.utilities = utilities;
        if (notes !== undefined)
            record.notes = notes;
        property.updatedAt = new Date().toISOString();
        await (0, db_js_1.saveProperty)(property);
        return {
            content: [{ type: "text", text: `Utilities record for ${MONTH_NAMES[month]} ${year} updated on '${property.propertyName}'.\n\n${JSON.stringify(record, null, 2)}` }],
        };
    });
    // GET UTILITIES RECORDS BY YEAR
    server.registerTool("utilities_list_by_year", {
        title: "List Utilities Records by Year",
        description: `Get all utilities records for a property in a specific year, with totals and payment summary. Year defaults to current year if omitted.`,
        inputSchema: index_js_1.GetUtilitiesByYearInputShape,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ propertyId, year: yearInput }) => {
        const year = yearInput ?? new Date().getFullYear();
        const property = await (0, db_js_1.getPropertyById)(propertyId);
        if (!property) {
            return { content: [{ type: "text", text: `Error: Property '${propertyId}' not found.` }] };
        }
        const records = property.utilitiesRecords
            .filter((r) => r.year === year)
            .sort((a, b) => a.month - b.month);
        const sumUtilities = (u) => (u.electricity ?? 0) + (u.water ?? 0) + (u.gas ?? 0) + (u.internet ?? 0) + (u.trash ?? 0);
        const totalDue = records.reduce((sum, r) => sum + sumUtilities(r.utilities), 0);
        const totalCollected = records
            .filter((r) => r.paid)
            .reduce((sum, r) => sum + sumUtilities(r.utilities), 0);
        const unpaidMonths = records
            .filter((r) => !r.paid)
            .map((r) => MONTH_NAMES[r.month] || `Month ${r.month}`);
        const result = {
            propertyName: property.propertyName,
            year,
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
        };
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // LIST ALL UTILITIES RECORDS
    server.registerTool("utilities_list_all", {
        title: "List All Utilities Records",
        description: `Get all utilities records for a property across all years, grouped by year with annual totals.`,
        inputSchema: index_js_1.PropertyIdInputShape,
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    }, async ({ propertyId }) => {
        const property = await (0, db_js_1.getPropertyById)(propertyId);
        if (!property) {
            return { content: [{ type: "text", text: `Error: Property '${propertyId}' not found.` }] };
        }
        const sumUtilities = (u) => (u.electricity ?? 0) + (u.water ?? 0) + (u.gas ?? 0) + (u.internet ?? 0) + (u.trash ?? 0);
        const byYear = {};
        const sortedRecords = [...property.utilitiesRecords].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
        for (const record of sortedRecords) {
            if (!byYear[record.year]) {
                byYear[record.year] = { records: [], totalCollected: 0, totalDue: 0 };
            }
            const monthlyTotal = sumUtilities(record.utilities);
            byYear[record.year].records.push({
                ...record,
                monthName: MONTH_NAMES[record.month] || `Month ${record.month}`,
                monthlyTotal,
            });
            byYear[record.year].totalDue += monthlyTotal;
            if (record.paid) {
                byYear[record.year].totalCollected += monthlyTotal;
            }
        }
        const result = {
            propertyName: property.propertyName,
            currency: property.currency,
            years: byYear,
        };
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
}
//# sourceMappingURL=utilities.js.map