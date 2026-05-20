# property-manager-mcp

A local MCP server for managing rental properties, built with TypeScript and the MCP SDK.

## Features

- **Property CRUD**: Add, update, delete, and list properties with full address, tenant, and lease info
- **Repair Expenses**: Track maintenance and repair costs per property by date/year
- **Rent Tracking**: Record monthly rent payments and track collection rates by year

## Data Storage

Properties are stored in a local `properties.json` file in the working directory (or `DATA_DIR` env variable).

## Setup

```bash
npm install
npm run build
```

## Running

```bash
# stdio (for MCP clients like Claude Desktop)
npm start
```

## Claude Desktop Config

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "property-manager": {
      "command": "node",
      "args": ["/absolute/path/to/property-manager-mcp/dist/index.js"],
      "env": {
        "DATA_DIR": "/absolute/path/to/data/folder"
      }
    }
  }
}
```

## Available Tools

### Property Management
| Tool | Description |
|------|-------------|
| `property_list_all` | List all properties sorted by state |
| `property_get` | Get full details of a single property |
| `property_add` | Add a new property |
| `property_update` | Update property info |
| `property_delete` | Permanently delete a property |

### Repair Expenses
| Tool | Description |
|------|-------------|
| `repair_add` | Add a repair/maintenance expense |
| `repair_delete` | Remove a repair expense |
| `repair_list` | List all repairs for a property |
| `repair_list_by_year` | List repairs filtered by year |

### Rent Records
| Tool | Description |
|------|-------------|
| `rent_add_record` | Add a monthly rent record |
| `rent_update_record` | Update an existing rent record (e.g., mark paid) |
| `rent_list_by_year` | Get rent records and summary for a year |
| `rent_list_all` | Get all rent records grouped by year |

## Data Model

```
Property
├── id, propertyName, address, rent, currency
├── tenants[]        { name, email, phone }
├── leaseStart, leaseEnd, propertyManager, notes
├── repairs[]        { id, description, amount, date, year, vendor, notes }
└── rentRecords[]    { year, month, amount, paid, paidDate, notes }
```
