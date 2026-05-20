"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUtilitiesByYearInputShape = exports.GetRentByYearInputShape = exports.UpdateUtilitiesRecordInputShape = exports.UpdateRentRecordInputShape = exports.AddUtilitiesRecordInputShape = exports.AddRentRecordInputShape = exports.GetRepairsByYearInputShape = exports.DeleteRepairInputShape = exports.AddRepairInputShape = exports.SearchPropertiesInputShape = exports.DeletePropertyInputShape = exports.PropertyIdInputShape = exports.UpdatePropertyInputShape = exports.AddPropertyInputShape = exports.RentRecordShape = exports.RepairExpenseShape = exports.TenantShape = exports.AddressShape = void 0;
const zod_1 = require("zod");
// ── Reusable field groups (ZodRawShape — plain objects of Zod fields) ──────────
exports.AddressShape = {
    street: zod_1.z.string().min(1).describe("Street address (e.g., '123 Main St')"),
    city: zod_1.z.string().min(1).describe("City name"),
    state: zod_1.z.string().min(2).describe("State or province code (e.g., 'WA')"),
    zip: zod_1.z.string().min(1).describe("ZIP or postal code"),
    country: zod_1.z.string().min(2).default("US").describe("Country code (default: 'US')"),
};
exports.TenantShape = {
    name: zod_1.z.string().min(1).describe("Tenant full name"),
    email: zod_1.z.string().email().optional().describe("Tenant email address"),
    phone: zod_1.z.string().optional().describe("Tenant phone number"),
};
exports.RepairExpenseShape = {
    description: zod_1.z.string().min(1).describe("Description of the repair or expense"),
    amount: zod_1.z.number().positive().describe("Cost of the repair in the property's currency"),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("Date of the expense (YYYY-MM-DD)"),
    vendor: zod_1.z.string().optional().describe("Vendor or contractor name"),
    notes: zod_1.z.string().optional().describe("Additional notes about the repair"),
};
exports.RentRecordShape = {
    year: zod_1.z.number().int().min(2000).max(2100).describe("Year of the rent record"),
    month: zod_1.z.number().int().min(1).max(12).describe("Month (1=January, 12=December)"),
    amount: zod_1.z.number().positive().describe("Rent amount paid or due"),
    paid: zod_1.z.boolean().describe("Whether this month's rent has been paid"),
    paidDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received (YYYY-MM-DD)"),
    notes: zod_1.z.string().optional().describe("Notes about this rent payment"),
};
// ── Tool input schemas (ZodRawShape for registerTool inputSchema) ──────────────
exports.AddPropertyInputShape = {
    propertyName: zod_1.z.string().min(1).describe("Display name for the property (e.g., 'Seattle Condo')"),
    address: zod_1.z.object(exports.AddressShape).describe("Full address of the property"),
    rent: zod_1.z.number().positive().describe("Monthly rent amount"),
    currency: zod_1.z.string().min(3).max(3).default("USD").describe("3-letter currency code (default: 'USD')"),
    tenants: zod_1.z.array(zod_1.z.object(exports.TenantShape)).describe("List of current tenants"),
    leaseStart: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Lease start date (YYYY-MM-DD)"),
    leaseEnd: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Lease end/expiry date (YYYY-MM-DD)"),
    propertyManager: zod_1.z.string().optional().describe("Name of the property manager"),
    notes: zod_1.z.string().optional().describe("General notes about the property"),
    mortgage: zod_1.z.object({
        lender: zod_1.z.string().min(2).optional().describe("Name of the mortgage lender"),
        monthlyPayment: zod_1.z.number().positive().optional().describe("Monthly mortgage payment amount"),
        interestRate: zod_1.z.number().min(0).max(100).optional().describe("Mortgage interest rate (percentage)"),
        termYears: zod_1.z.number().min(1).optional().describe("Mortgage term length (in years)"),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Mortgage start date (YYYY-MM-DD)")
    }).optional().describe("Mortgage details for the property"),
    propertyTax: zod_1.z.number().positive().optional().describe("Annual property tax amount"),
};
exports.UpdatePropertyInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property to update"),
    propertyName: zod_1.z.string().min(1).optional().describe("New display name"),
    address: zod_1.z.object(exports.AddressShape).partial().optional().describe("Updated address fields (partial)"),
    rent: zod_1.z.number().positive().optional().describe("Updated monthly rent amount"),
    currency: zod_1.z.string().min(3).max(3).optional().describe("Updated currency code"),
    tenants: zod_1.z.array(zod_1.z.object(exports.TenantShape)).optional().describe("Updated list of tenants (replaces existing)"),
    leaseStart: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Updated lease start date"),
    leaseEnd: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Updated lease end date"),
    propertyManager: zod_1.z.string().optional().describe("Updated property manager name"),
    notes: zod_1.z.string().optional().describe("Updated notes"),
    mortgage: zod_1.z.object({
        lender: zod_1.z.string().min(2).optional().describe("Updated mortgage lender"),
        monthlyPayment: zod_1.z.number().positive().optional().describe("Updated monthly mortgage payment"),
        interestRate: zod_1.z.number().min(0).max(100).optional().describe("Updated mortgage interest rate"),
        termYears: zod_1.z.number().min(1).optional().describe("Updated mortgage term length"),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Updated mortgage start date")
    }).optional().describe("Updated mortgage details"),
    propertyTax: zod_1.z.number().positive().optional().describe("Updated annual property tax amount"),
};
exports.PropertyIdInputShape = {
    propertyId: zod_1.z.string().min(1).describe("Unique property ID"),
};
exports.DeletePropertyInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property to delete"),
    dryRun: zod_1.z.boolean().default(false).describe("If true, previews what would be deleted without actually deleting. Always use dryRun=true first to confirm with the user."),
};
exports.SearchPropertiesInputShape = {
    city: zod_1.z.string().optional().describe("Filter by city name (case-insensitive partial match, e.g., 'kent')"),
    state: zod_1.z.string().optional().describe("Filter by state code (case-insensitive, e.g., 'WA')"),
    propertyName: zod_1.z.string().optional().describe("Filter by property name (case-insensitive partial match)"),
    tenantName: zod_1.z.string().optional().describe("Filter by tenant name (case-insensitive partial match)"),
    street: zod_1.z.string().optional().describe("Filter by street address (case-insensitive partial match)"),
};
exports.AddRepairInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    description: zod_1.z.string().min(1).describe("Description of the repair or expense"),
    amount: zod_1.z.number().positive().describe("Cost of the repair in the property's currency"),
    date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date of the expense (YYYY-MM-DD)"),
    vendor: zod_1.z.string().optional().describe("Vendor or contractor name"),
    notes: zod_1.z.string().optional().describe("Additional notes about the repair"),
};
exports.DeleteRepairInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    repairId: zod_1.z.string().min(1).describe("ID of the repair expense to delete"),
};
exports.GetRepairsByYearInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).describe("Year to retrieve repair expenses for"),
};
exports.AddRentRecordInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).max(2100).describe("Year of the rent record"),
    month: zod_1.z.number().int().min(1).max(12).describe("Month (1=January, 12=December)"),
    amount: zod_1.z.number().positive().describe("Rent amount paid or due"),
    paid: zod_1.z.boolean().describe("Whether this month's rent has been paid"),
    paidDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received (YYYY-MM-DD)"),
    notes: zod_1.z.string().optional().describe("Notes about this rent payment"),
};
exports.AddUtilitiesRecordInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).max(2100).optional().describe("Year of the utilities record (defaults to current year)"),
    month: zod_1.z.number().int().min(1).max(12).optional().describe("Month 1-12 (defaults to current month)"),
    utilities: zod_1.z.object({
        electricity: zod_1.z.number().positive().optional().describe("Electricity cost"),
        water: zod_1.z.number().positive().optional().describe("Water cost"),
        gas: zod_1.z.number().positive().optional().describe("Gas cost"),
        internet: zod_1.z.number().positive().optional().describe("Internet cost"),
        trash: zod_1.z.number().positive().optional().describe("Trash collection cost"),
    }).describe("Utilities expenses for the month"),
    paid: zod_1.z.boolean().describe("Whether utilities have been paid for this month"),
    paidDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date utilities payment was received (YYYY-MM-DD)"),
    notes: zod_1.z.string().optional().describe("Notes about this utilities record"),
};
exports.UpdateRentRecordInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).describe("Year of the rent record to update"),
    month: zod_1.z.number().int().min(1).max(12).describe("Month of the rent record to update"),
    paid: zod_1.z.boolean().optional().describe("Update paid status"),
    paidDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received"),
    amount: zod_1.z.number().positive().optional().describe("Updated rent amount"),
    notes: zod_1.z.string().optional().describe("Updated notes"),
};
exports.UpdateUtilitiesRecordInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).optional().describe("Year of the utilities record to update (defaults to current year)"),
    month: zod_1.z.number().int().min(1).max(12).optional().describe("Month of the utilities record to update (defaults to current month)"),
    paid: zod_1.z.boolean().optional().describe("Update paid status"),
    paidDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received"),
    utilities: zod_1.z.object({
        electricity: zod_1.z.number().positive().optional().describe("Updated electricity cost"),
        water: zod_1.z.number().positive().optional().describe("Updated water cost"),
        gas: zod_1.z.number().positive().optional().describe("Updated gas cost"),
        internet: zod_1.z.number().positive().optional().describe("Updated internet cost"),
        trash: zod_1.z.number().positive().optional().describe("Updated trash collection cost"),
    }).optional().describe("Updated utilities expenses for the month"),
    notes: zod_1.z.string().optional().describe("Updated notes about this utilities record"),
};
exports.GetRentByYearInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).describe("Year to retrieve rent records for"),
};
exports.GetUtilitiesByYearInputShape = {
    propertyId: zod_1.z.string().min(1).describe("ID of the property"),
    year: zod_1.z.number().int().min(2000).optional().describe("Year to retrieve utilities records for (defaults to current year)"),
};
//# sourceMappingURL=index.js.map