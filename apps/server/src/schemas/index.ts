import { z } from "zod";

// ── Reusable field groups (ZodRawShape — plain objects of Zod fields) ──────────

export const AddressShape = {
  street: z.string().min(1).describe("Street address (e.g., '123 Main St')"),
  city: z.string().min(1).describe("City name"),
  state: z.string().min(2).describe("State or province code (e.g., 'WA')"),
  zip: z.string().min(1).describe("ZIP or postal code"),
  country: z.string().min(2).default("US").describe("Country code (default: 'US')"),
};

export const TenantShape = {
  name: z.string().min(1).describe("Tenant full name"),
  email: z.string().email().optional().describe("Tenant email address"),
  phone: z.string().optional().describe("Tenant phone number"),
};

export const RepairExpenseShape = {
  description: z.string().min(1).describe("Description of the repair or expense"),
  amount: z.number().positive().describe("Cost of the repair in the property's currency"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe("Date of the expense (YYYY-MM-DD)"),
  vendor: z.string().optional().describe("Vendor or contractor name"),
  notes: z.string().optional().describe("Additional notes about the repair"),
};

export const RentRecordShape = {
  year: z.number().int().min(2000).max(2100).describe("Year of the rent record"),
  month: z.number().int().min(1).max(12).describe("Month (1=January, 12=December)"),
  amount: z.number().positive().describe("Rent amount paid or due"),
  paid: z.boolean().describe("Whether this month's rent has been paid"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received (YYYY-MM-DD)"),
  notes: z.string().optional().describe("Notes about this rent payment"),
};

// ── Tool input schemas (ZodRawShape for registerTool inputSchema) ──────────────

export const AddPropertyInputShape = {
  propertyName: z.string().min(1).describe("Display name for the property (e.g., 'Seattle Condo')"),
  address: z.object(AddressShape).describe("Full address of the property"),
  rent: z.number().positive().describe("Monthly rent amount"),
  currency: z.string().min(3).max(3).default("USD").describe("3-letter currency code (default: 'USD')"),
  tenants: z.array(z.object(TenantShape)).describe("List of current tenants"),
  leaseStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Lease start date (YYYY-MM-DD)"),
  leaseEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Lease end/expiry date (YYYY-MM-DD)"),
  propertyManager: z.string().optional().describe("Name of the property manager"),
  notes: z.string().optional().describe("General notes about the property"),
  mortgage: z.object({
    lender: z.string().min(2).optional().describe("Name of the mortgage lender"),
    monthlyPayment: z.number().positive().optional().describe("Monthly mortgage payment amount"),
    interestRate: z.number().min(0).max(100).optional().describe("Mortgage interest rate (percentage)"),
    termYears: z.number().min(1).optional().describe("Mortgage term length (in years)"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Mortgage start date (YYYY-MM-DD)")
  }).optional().describe("Mortgage details for the property"),
  propertyTax: z.number().positive().optional().describe("Annual property tax amount"),
};

export const UpdatePropertyInputShape = {
  propertyId: z.string().min(1).describe("ID of the property to update"),
  propertyName: z.string().min(1).optional().describe("New display name"),
  address: z.object(AddressShape).partial().optional().describe("Updated address fields (partial)"),
  rent: z.number().positive().optional().describe("Updated monthly rent amount"),
  currency: z.string().min(3).max(3).optional().describe("Updated currency code"),
  tenants: z.array(z.object(TenantShape)).optional().describe("Updated list of tenants (replaces existing)"),
  leaseStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Updated lease start date"),
  leaseEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Updated lease end date"),
  propertyManager: z.string().optional().describe("Updated property manager name"),
  notes: z.string().optional().describe("Updated notes"),
  mortgage: z.object({
    lender: z.string().min(2).optional().describe("Updated mortgage lender"),
    monthlyPayment: z.number().positive().optional().describe("Updated monthly mortgage payment"),
    interestRate: z.number().min(0).max(100).optional().describe("Updated mortgage interest rate"),
    termYears: z.number().min(1).optional().describe("Updated mortgage term length"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Updated mortgage start date")
  }).optional().describe("Updated mortgage details"),
  propertyTax: z.number().positive().optional().describe("Updated annual property tax amount"),
};

export const PropertyIdInputShape = {
  propertyId: z.string().min(1).describe("Unique property ID"),
};

export const DeletePropertyInputShape = {
  propertyId: z.string().min(1).describe("ID of the property to delete"),
  dryRun: z.boolean().default(false).describe("If true, previews what would be deleted without actually deleting. Always use dryRun=true first to confirm with the user."),
};

export const SearchPropertiesInputShape = {
  city: z.string().optional().describe("Filter by city name (case-insensitive partial match, e.g., 'kent')"),
  state: z.string().optional().describe("Filter by state code (case-insensitive, e.g., 'WA')"),
  propertyName: z.string().optional().describe("Filter by property name (case-insensitive partial match)"),
  tenantName: z.string().optional().describe("Filter by tenant name (case-insensitive partial match)"),
  street: z.string().optional().describe("Filter by street address (case-insensitive partial match)"),
};

export const AddRepairInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  description: z.string().min(1).describe("Description of the repair or expense"),
  amount: z.number().positive().describe("Cost of the repair in the property's currency"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Date of the expense (YYYY-MM-DD)"),
  vendor: z.string().optional().describe("Vendor or contractor name"),
  notes: z.string().optional().describe("Additional notes about the repair"),
};

export const DeleteRepairInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  repairId: z.string().min(1).describe("ID of the repair expense to delete"),
};

export const GetRepairsByYearInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).describe("Year to retrieve repair expenses for"),
};

export const AddRentRecordInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).max(2100).describe("Year of the rent record"),
  month: z.number().int().min(1).max(12).describe("Month (1=January, 12=December)"),
  amount: z.number().positive().describe("Rent amount paid or due"),
  paid: z.boolean().describe("Whether this month's rent has been paid"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received (YYYY-MM-DD)"),
  notes: z.string().optional().describe("Notes about this rent payment"),
};

export const AddUtilitiesRecordInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).max(2100).optional().describe("Year of the utilities record (defaults to current year)"),
  month: z.number().int().min(1).max(12).optional().describe("Month 1-12 (defaults to current month)"),
  utilities: z.object({
    electricity: z.number().positive().optional().describe("Electricity cost"),
    water: z.number().positive().optional().describe("Water cost"),
    gas: z.number().positive().optional().describe("Gas cost"),
    internet: z.number().positive().optional().describe("Internet cost"),
    trash: z.number().positive().optional().describe("Trash collection cost"),
  }).describe("Utilities expenses for the month"),
  paid: z.boolean().describe("Whether utilities have been paid for this month"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date utilities payment was received (YYYY-MM-DD)"),
  notes: z.string().optional().describe("Notes about this utilities record"),
};

export const UpdateRentRecordInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).describe("Year of the rent record to update"),
  month: z.number().int().min(1).max(12).describe("Month of the rent record to update"),
  paid: z.boolean().optional().describe("Update paid status"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received"),
  amount: z.number().positive().optional().describe("Updated rent amount"),
  notes: z.string().optional().describe("Updated notes"),
};

export const UpdateUtilitiesRecordInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).optional().describe("Year of the utilities record to update (defaults to current year)"),
  month: z.number().int().min(1).max(12).optional().describe("Month of the utilities record to update (defaults to current month)"),
  paid: z.boolean().optional().describe("Update paid status"),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Date payment was received"),
  utilities: z.object({
    electricity: z.number().positive().optional().describe("Updated electricity cost"),
    water: z.number().positive().optional().describe("Updated water cost"),
    gas: z.number().positive().optional().describe("Updated gas cost"),
    internet: z.number().positive().optional().describe("Updated internet cost"),
    trash: z.number().positive().optional().describe("Updated trash collection cost"),
  }).optional().describe("Updated utilities expenses for the month"),
  notes: z.string().optional().describe("Updated notes about this utilities record"),
};

export const GetRentByYearInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).describe("Year to retrieve rent records for"),
};

export const GetUtilitiesByYearInputShape = {
  propertyId: z.string().min(1).describe("ID of the property"),
  year: z.number().int().min(2000).optional().describe("Year to retrieve utilities records for (defaults to current year)"),
};
