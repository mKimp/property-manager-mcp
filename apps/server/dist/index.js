"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const repairs_js_1 = require("./tools/repairs.js");
const rent_js_1 = require("./tools/rent.js");
const properties_js_1 = require("./tools/properties.js");
const utilities_js_1 = require("./tools/utilities.js");
const server = new mcp_js_1.McpServer({
    name: "property-manager-mcp",
    version: "1.0.0",
});
(0, properties_js_1.registerPropertyTools)(server);
(0, repairs_js_1.registerRepairTools)(server);
(0, rent_js_1.registerRentTools)(server);
(0, utilities_js_1.registerUtilitiesTools)(server);
async function runStdio() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Property Manager MCP server running on stdio");
}
runStdio().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map