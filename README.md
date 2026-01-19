# Project MCP Server

A powerful **Model Context Protocol (MCP)** server that dynamically serves context about your project. It acts as a bridge, allowing LLM agents to explore and interact with your project's APIs (via OpenAPI) and databases.

## Quick Start (Zero Config)

The easiest way to use this server is to run it directly with `npx`. This requires no code changes to your project.

### Run with npx

**For Cursor / Claude Desktop:**
Add this to your MCP settings configuration:

```json
{
  "mcpServers": {
    "my-project": {
      "command": "npx",
      "args": ["-y", "@williamp29/project-mcp-server"],
      "env": {
        "PROJECT_MCP_API_BASE_URL": "...",
        "PROJECT_MCP_DB_HOST": "..."
      }
    }
  }
}
```
*(Note: You can pass environment variables directly in the JSON config or load them from a file if your MCP client supports it.)*

---

## Library Integration (Advanced)

For deep integration, install the package as a dependency in your Node.js project. This allows you to customize authentication, add custom tools, or use it programmatically.

### 1. Install
```bash
npm install @williamp29/project-mcp-server
```

### 2. Create an Entry Point
Create a file (e.g., `mcp-server.ts`) to configure and start your server:

```typescript
import { MCPServer, MySQLDriver } from "@williamp29/project-mcp-server";
import { AuthStrategy, GlobalAuthContext } from "@williamp29/project-mcp-server/api-explorer";

// 1. (Optional) Define a custom authentication strategy for APIs
class MyCustomAuth implements AuthStrategy {
  name = "MyCustomAuth";
  async getHeaders() {
    return { "Authorization": `Bearer ${process.env.MY_API_TOKEN}` };
  }
}

// 2. (Optional) Initialize a database driver
// You can use the built-in MySQLDriver
const mysqlDriver = new MySQLDriver({
  host: process.env.DB_HOST || "localhost",
  port: 3306,
  user: "root",
  password: "password",
  database: "my_database"
});

// 3. Create and start the server
const server = new MCPServer({
  specPath: "./openapi-spec.json",
  authContext: new GlobalAuthContext(new MyCustomAuth()),
  database: {
    driver: mysqlDriver,
    permissions: {
      enableRunQuery: true,         // Default: true
      enableRunUpdateStatement: true, // Default: true
      enableRunDeleteStatement: false, // Default: false
      enableRunStatement: false      // Default: false
    }
  }
});

server.start().catch(console.error);
```

### 3. Custom Database Drivers
You can implement your own database driver by satisfying the `DbDriver` interface. This allows you to use any database (PostgreSQL, SQLite, etc.) with the MCP server.

```typescript
import { MCPServer, DbDriver, DbDriverPermissions, DbDriverToolDefinitions } from "@williamp29/project-mcp-server";

class MyPostgresDriver implements DbDriver {
  name = "postgres";
  
  async connect() { /* ... */ }
  async disconnect() { /* ... */ }
  
  // Implement introspection methods
  async listTables() { /* ... */ }
  async listTableNames() { return ["table1", "table2"]; }
  async describeTable(table: string) { /* ... */ }
  // ... other DbDriver methods

  // Define which tools this driver supports
  getToolDefinitions(permissions: DbDriverPermissions): DbDriverToolDefinitions {
    return {
      db_list_tables: { description: "List all tables" },
      // ...
    };
  }

  // Handle tool execution
  async handleToolCall(name: string, args: any) {
    if (name === "db_list_tables") return this.listTables();
    // ...
  }
}

const server = new MCPServer({
  specPath: "./openapi-spec.json",
  database: {
    driver: new MyPostgresDriver()
  }
});
```

### 3. Add Script to package.json
```json
{
  "scripts": {
    "mcp": "ts-node mcp-server.ts"
  }
}
```

### 4. Use in Cursor
```json
{
  "mcpServers": {
    "my-integrated-project": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

---

## Configuration Reference

### Environment Variables
These variables control the server behavior. They are automatically loaded if you use the `npx` method or if you use `dotenv` in your custom script.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PROJECT_MCP_API_BASE_URL` | Base URL of the target API | - |
| `PROJECT_MCP_AUTH_TYPE` | Auth method: `bearer`, `identity`, `none` | `none` |
| `PROJECT_MCP_AUTH_IDENTIFIER` | Default ID for `identity` auth | - |
| `PROJECT_MCP_DB_HOST` | Database hostname | - |
| `PROJECT_MCP_DB_PORT` | Database port | `3306` |
| `PROJECT_MCP_DB_USER` | Database username | - |
| `PROJECT_MCP_DB_PASSWORD` | Database password | - |
| `PROJECT_MCP_DB_DATABASE` | Database name | - |

---

## Features

- **API Explorer**:
  - Automatically parses OpenAPI 3.0 specifications.
  - Exposes tools like `api_get_tags`, `api_get_endpoints`, and `api_call_endpoint`.
  - Supports dynamic path parameters and JSON bodies.
  - `api_set_identity`: Switch the active user context for API calls dynamically during a session.

- **Database Explorer**:
  - Inspect schemas with `db_list_tables`, `db_list_table_names`, `db_describe_tables`, and `db_get_schemas`.
  - Discover database structure with `db_get_relationships` (supports table filtering).
  - Analyze data with `db_get_table_stats` and `db_sample_rows`.
  - Run validated SQL with `db_run_query`, `db_run_update_statement`, and `db_run_delete_statement`.
  - Extensible architecture: Supports **Custom Drivers**!
  - Includes `MySQLDriver` for direct MySQL/MariaDB usage.