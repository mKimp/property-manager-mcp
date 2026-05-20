import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerRepairTools } from "./tools/repairs.js";
import { registerRentTools } from "./tools/rent.js";
import { registerPropertyTools } from "./tools/properties.js";
import { registerUtilitiesTools } from "./tools/utilities.js";

const server = new McpServer({
  name: "property-manager-mcp",
  version: "1.0.0",
});

registerPropertyTools(server);
registerRepairTools(server);
registerRentTools(server);
registerUtilitiesTools(server);

async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Property Manager MCP server running on stdio");
}

runStdio().catch((error: unknown) => {
  console.error("Server error:", error);
  process.exit(1);
});
