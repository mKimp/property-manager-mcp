import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { v4 as uuidv4 } from "uuid";
import {
  AddRepairInputShape,
  DeleteRepairInputShape,
  PropertyIdInputShape,
  GetRepairsByYearInputShape,
} from "../schemas/index.js";
import { getPropertyById, saveProperty } from "../services/db.js";

export function registerRepairTools(server: McpServer): void {

  // ADD REPAIR EXPENSE
  server.registerTool(
    "repair_add",
    {
      title: "Add Repair Expense",
      description: `Add a repair or maintenance expense to a property.

Args:
  - propertyId (string): ID of the property
  - description (string): What was repaired/replaced
  - amount (number): Cost of the repair
  - date (string): Date of expense YYYY-MM-DD
  - vendor (string, optional): Contractor or vendor name
  - notes (string, optional): Additional notes

Returns: The newly added repair expense.`,
      inputSchema: AddRepairInputShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ propertyId, description, amount, date, vendor, notes }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const year = parseInt(date.substring(0, 4), 10);
      const newRepair = {
        id: uuidv4(),
        description,
        amount,
        date,
        year,
        ...(vendor !== undefined ? { vendor } : {}),
        ...(notes !== undefined ? { notes } : {}),
      };
      property.repairs.push(newRepair);
      property.updatedAt = new Date().toISOString();
      await saveProperty(property);
      return {
        content: [{ type: "text" as const, text: `Repair expense added to '${property.propertyName}'.\n\n${JSON.stringify(newRepair, null, 2)}` }],
      };
    }
  );

  // DELETE REPAIR EXPENSE
  server.registerTool(
    "repair_delete",
    {
      title: "Delete Repair Expense",
      description: `Remove a repair expense from a property.

Args:
  - propertyId (string): ID of the property
  - repairId (string): ID of the repair expense to delete

Returns: Confirmation message.`,
      inputSchema: DeleteRepairInputShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async ({ propertyId, repairId }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const index = property.repairs.findIndex((r) => r.id === repairId);
      if (index === -1) {
        return { content: [{ type: "text" as const, text: `Error: Repair '${repairId}' not found on property '${property.propertyName}'.` }] };
      }
      const removed = property.repairs.splice(index, 1)[0];
      property.updatedAt = new Date().toISOString();
      await saveProperty(property);
      return {
        content: [{ type: "text" as const, text: `Repair expense '${removed.description}' ($${removed.amount}) removed from '${property.propertyName}'.` }],
      };
    }
  );

  // LIST ALL REPAIRS
  server.registerTool(
    "repair_list",
    {
      title: "List Repair Expenses",
      description: `List all repair expenses for a property, sorted by date descending.

Args:
  - propertyId (string): ID of the property

Returns: Array of repair expenses with total cost summary.`,
      inputSchema: PropertyIdInputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const repairs = [...property.repairs].sort((a, b) => b.date.localeCompare(a.date));
      const total = repairs.reduce((sum, r) => sum + r.amount, 0);
      const result = { propertyName: property.propertyName, repairs, total, currency: property.currency };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // GET REPAIRS BY YEAR
  server.registerTool(
    "repair_list_by_year",
    {
      title: "List Repair Expenses by Year",
      description: `List all repair expenses for a property filtered by a specific year.

Args:
  - propertyId (string): ID of the property
  - year (number): Year to filter by (e.g., 2024)

Returns: Repair expenses for that year with total cost.`,
      inputSchema: GetRepairsByYearInputShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ propertyId, year }) => {
      const property = await getPropertyById(propertyId);
      if (!property) {
        return { content: [{ type: "text" as const, text: `Error: Property '${propertyId}' not found.` }] };
      }
      const repairs = property.repairs
        .filter((r) => r.year === year)
        .sort((a, b) => b.date.localeCompare(a.date));
      const total = repairs.reduce((sum, r) => sum + r.amount, 0);
      const result = { propertyName: property.propertyName, year, repairs, total, currency: property.currency };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
