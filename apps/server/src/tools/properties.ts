import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { v4 as uuidv4 } from "uuid";
import {
  AddPropertyInputShape,
  UpdatePropertyInputShape,
  PropertyIdInputShape,
  SearchPropertiesInputShape,
  DeletePropertyInputShape,
} from "../schemas/index.js";
import {
  getAllProperties,
  getPropertyById,
  saveProperty,
  deleteProperty,
} from "../services/db.js";
import { Property } from "../types.js";

export function registerPropertyTools(server: McpServer): void {

  // LIST ALL PROPERTIES
  server.registerTool(
    "property_list_all",
    {
      title: "List All Properties",
      description: `Retrieve all properties sorted by state. Returns a summary of each property including name, address, rent, tenants, and lease dates.

Returns: Array of property summaries with id, propertyName, address, rent, currency, tenants, leaseStart, leaseEnd, propertyManager, notes.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      const properties = await getAllProperties();
      if (properties.length === 0) {
        return { content: [{ type: "text" as const, text: "No properties found." }] };
      }
      const summaries = properties.map((p) => ({
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
      return {
        content: [{ type: "text" as const, text: JSON.stringify(summaries, null, 2) }],
      };
    }
  );

  // GET PROPERTY BY ID
  server.registerTool(
    "property_get",
    {
      title: "Get Property Details",
      description: `Get full details of a single property including all repair expenses and rent records.

Args:
  - propertyId (string): The unique property ID

Returns: Full property object with repairs[] and rentRecords[].`,
      inputSchema: PropertyIdInputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(property, null, 2) }],
      };
    }
  );

  // ADD PROPERTY
  server.registerTool(
    "property_add",
    {
      title: "Add Property",
      description: `Add a new property to the manager.

Args:
  - propertyName (string): Display name (e.g., 'Seattle Condo')
  - address (object): { street, city, state, zip, country }
  - rent (number): Monthly rent amount
  - currency (string): 3-letter currency code (default: 'USD')
  - tenants (array): [{ name, email?, phone? }]
  - leaseStart (string, optional): YYYY-MM-DD
  - leaseEnd (string, optional): YYYY-MM-DD
  - propertyManager (string, optional)
  - notes (string, optional)
  - mortgage (object, optional): { lender, monthlyPayment, interestRate, termYears, startDate }
  - propertyTax (number, optional): Annual property tax amount

Returns: The newly created property with its generated ID.`,
      inputSchema: AddPropertyInputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ propertyName, address, rent, currency, tenants, leaseStart, leaseEnd, propertyManager, notes, mortgage, propertyTax }) => {
      const now = new Date().toISOString();
      const property: Property = {
        id: uuidv4(),
        propertyName,
        address,
        rent,
        currency: currency ?? "USD",
        tenants,
        leaseStart,
        leaseEnd,
        propertyManager,
        notes,
        repairs: [],
        rentRecords: [],
        createdAt: now,
        updatedAt: now,
        mortgage: mortgage ? { ...mortgage, monthlyPayment: mortgage.monthlyPayment ?? 0 } : undefined,
        propertyTax: propertyTax ? propertyTax : 0,
        utilitiesRecords: [],
      };
      await saveProperty(property);
      return {
        content: [{ type: "text" as const, text: `Property '${property.propertyName}' added with ID: ${property.id}\n\n${JSON.stringify(property, null, 2)}` }],
      };
    }
  );

  // UPDATE PROPERTY
  server.registerTool(
    "property_update",
    {
      title: "Update Property",
      description: `Update an existing property's basic information (name, address, rent, tenants, lease dates, etc.).
Does NOT modify repair expenses or rent records — use dedicated tools for those.

IMPORTANT: If the user referred to a property by name/location (not ID), call property_search first to resolve the correct ID.

Args:
  - propertyId (string): ID of property to update
  - Any fields to update: propertyName, address (partial), rent, currency, tenants, leaseStart, leaseEnd, propertyManager, notes

Returns: The updated property object.`,
      inputSchema: UpdatePropertyInputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId, propertyName, address, rent, currency, tenants, leaseStart, leaseEnd, propertyManager, notes, mortgage, propertyTax  }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      if (address) property.address = { ...property.address, ...address };
      if (propertyName !== undefined) property.propertyName = propertyName;
      if (rent !== undefined) property.rent = rent;
      if (currency !== undefined) property.currency = currency;
      if (tenants !== undefined) property.tenants = tenants;
      if (leaseStart !== undefined) property.leaseStart = leaseStart;
      if (leaseEnd !== undefined) property.leaseEnd = leaseEnd;
      if (propertyManager !== undefined) property.propertyManager = propertyManager;
      if (notes !== undefined) property.notes = notes;
      if(mortgage !== undefined) property.mortgage = { ...property.mortgage, ...mortgage, monthlyPayment: mortgage.monthlyPayment ?? property.mortgage?.monthlyPayment ?? 0 };
      if(propertyTax !== undefined) property.propertyTax = propertyTax;

      property.updatedAt = new Date().toISOString();
      await saveProperty(property);
      return {
        content: [{ type: "text" as const, text: `Property '${property.propertyName}' updated.\n\n${JSON.stringify(property, null, 2)}` }],
      };
    }
  );

  // SEARCH PROPERTIES
  server.registerTool(
    "property_search",
    {
      title: "Search Properties",
      description: `Search properties by city, state, name, street, or tenant name. Use this BEFORE update/delete to resolve ambiguous user requests like 'delete the Kent property' or 'update my Seattle condo'.

Args (all optional, combined with AND logic):
  - city (string): Partial city name match (e.g., 'kent')
  - state (string): State code (e.g., 'WA')
  - propertyName (string): Partial property name match
  - tenantName (string): Partial tenant name match
  - street (string): Partial street address match

Returns: Matching properties with id, name, address, rent, tenants.
If multiple matches are found, present them to the user and ask which one they mean before proceeding.`,
      inputSchema: SearchPropertiesInputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ city, state, propertyName, tenantName, street }) => {
      const properties = await getAllProperties();
      const matches = properties.filter((p) => {
        if (city && !p.address.city.toLowerCase().includes(city.toLowerCase())) return false;
        if (state && !p.address.state.toLowerCase().includes(state.toLowerCase())) return false;
        if (propertyName && !p.propertyName.toLowerCase().includes(propertyName.toLowerCase())) return false;
        if (street && !p.address.street.toLowerCase().includes(street.toLowerCase())) return false;
        if (tenantName && !p.tenants.some((t) => t.name.toLowerCase().includes(tenantName.toLowerCase()))) return false;
        return true;
      });

      if (matches.length === 0) {
        return { content: [{ type: "text" as const, text: "No properties found matching the search criteria." }] };
      }

      const summaries = matches.map((p) => ({
        id: p.id,
        propertyName: p.propertyName,
        address: p.address,
        rent: p.rent,
        currency: p.currency,
        tenants: p.tenants,
        leaseEnd: p.leaseEnd,
      }));

      const message = matches.length > 1
        ? `Found ${matches.length} matching properties. Confirm with the user which one they mean before proceeding.\n\n${JSON.stringify(summaries, null, 2)}`
        : JSON.stringify(summaries, null, 2);

      return {
        content: [{ type: "text" as const, text: message }],
      };
    }
  );

  // DELETE PROPERTY
  server.registerTool(
    "property_delete",
    {
      title: "Delete Property",
      description: `Permanently delete a property and all its associated repair expenses and rent records.

IMPORTANT WORKFLOW:
1. If the user referred to a property by name/location (not ID), call property_search first to find it.
2. If multiple matches exist, ask the user to confirm which one.
3. Always call with dryRun=true first to show the user what will be deleted.
4. Only call with dryRun=false after explicit user confirmation.

Args:
  - propertyId (string): ID of property to delete
  - dryRun (boolean): If true, previews deletion without deleting (default: false)

Returns: Summary of what was/would be deleted including repair count and rent record count.`,
      inputSchema: DeletePropertyInputShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async ({ propertyId, dryRun }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }

      const summary = {
        id: property.id,
        propertyName: property.propertyName,
        address: property.address,
        rent: property.rent,
        tenants: property.tenants,
        repairExpenses: property.repairs.length,
        rentRecords: property.rentRecords.length,
        totalRepairCost: property.repairs.reduce((sum, r) => sum + r.amount, 0),
      };

      if (dryRun) {
        return {
          content: [{
            type: "text" as const,
            text: `DRY RUN — Nothing was deleted. The following property would be permanently removed:\n\n${JSON.stringify(summary, null, 2)}\n\nTo confirm deletion, call property_delete again with dryRun=false.`,
          }],
        };
      }

      await deleteProperty(propertyId);
      return {
        content: [{
          type: "text" as const,
          text: `Property '${property.propertyName}' has been permanently deleted.\n\nDeleted: ${summary.repairExpenses} repair records, ${summary.rentRecords} rent records.`,
        }],
      };
    }
  );
}
