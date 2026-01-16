# Your project's MCP Server

A powerful Model Context Protocol (MCP) server that dynamically serves context about your project. It can explore and interact with any API defined by an OpenAPI specification.

## For LLM Agents: How to use this MCP

This server provides a set of "meta-tools" that allow you to discover and interact with an API without needing individual tools for every endpoint.

### Recommended Workflow:
1.  **Discovery**: Start by calling `get_tags` to understand the broad areas of the API.
2.  **Listing**: Use `get_tag_endpoints` or `get_all_endpoints` to see available actions for a specific topic.
3.  **Details**: Call `get_endpoint` for a specific path and method to see exactly what parameters and request body are required.
4.  **Execution**: Use `call_endpoint` to perform the actual API request.

### Identity & Impersonation:
If the server is configured with an `identity` strategy, you can use `set_identity` to act on behalf of a specific user (e.g., passing a UID).

---

## Installation & Setup

### 1. Build the project
```bash
npm install
npm run build
```

### 2. Configure Environment Variables
Create a `.env` file (see `.env.example`):
- `PROJECT_MCP_API_BASE_URL`: The target API URL.
- `PROJECT_MCP_AUTH_TYPE`: `bearer`, `identity`, or `none`.
- `PROJECT_MCP_AUTH_IDENTIFIABLE`: (Optional) e.g., `UID:`.
- `PROJECT_MCP_AUTH_IDENTIFIER`: Default ID value.

### 3. Usage in Cursor / Claude Desktop
Add a new MCP server with the following command:
```bash
node /path/to/dist/cli.js
```

Or if installed via npm:
```bash
npx @williamp29/project-mcp-server
```

## Integration in Your Project

The recommended way to use this package is to install it in your project and create a custom entry point.

### Step 1: Install
```bash
npm install @williamp29/project-mcp-server
```

### Step 2: Create your MCP entry file
Create a file called `mcp-serve.js` (or `.ts`) in your project root:

```javascript
// mcp-serve.js
import { MCPServer } from "@williamp29/project-mcp-server";
import { AuthStrategy, GlobalAuthContext } from "@williamp29/project-mcp-server/api-explorer";

// Your custom authentication logic
class MyAuth implements AuthStrategy {
  name = "MyAuth";
  async getHeaders() {
    // Read from your own config, database, vault, etc.
    return { "Authorization": `Bearer ${process.env.MY_API_TOKEN}` };
  }
}

const authContext = new GlobalAuthContext(new MyAuth());
const server = new MCPServer("./openapi-spec.json", authContext);
server.start();
```

### Step 3: Add the npm script
In your project's `package.json`:
```json
{
  "scripts": {
    "mcp:serve": "node mcp-serve.js"
  }
}
```

### Step 4: Configure Cursor
In your Cursor MCP settings (`mcp_settings.json`):
```json
{
  "my-api-mcp": {
    "command": "npm",
    "args": ["run", "mcp:serve"],
    "cwd": "/absolute/path/to/your/project"
  }
}
```

Now Cursor will run your custom script whenever it needs to use the MCP server.

---

## Programmatic Usage

If you are using this as a library in your own Node.js project:

### Basic Setup
```typescript
import { MCPServer } from "@williamp29/project-mcp-server";

const server = new MCPServer("./openapi-spec.json");
server.start().catch(console.error);
```

### Custom Authentication Strategy
You can implement your own logic for fetching or rotating tokens:

```typescript
import { MCPServer } from "@williamp29/project-mcp-server";
import { AuthStrategy, GlobalAuthContext } from "@williamp29/project-mcp-server/api-explorer";

class MyCustomAuth implements AuthStrategy {
  name = "MyCustomAuth";
  async getHeaders() {
    const token = await fetchTokenFromVault();
    return { "X-Custom-Auth": token };
  }
}

const authContext = new GlobalAuthContext(new MyCustomAuth());
const server = new MCPServer("./spec.json", authContext);
server.start();
```

### Request Hooks
Add custom logic to every request (logging, tracing, extra headers):

```typescript
import { addRequestHook } from "@williamp29/project-mcp-server/api-explorer";

addRequestHook((config) => {
  console.error(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  config.headers["X-Request-ID"] = "mcp-123";
  return config;
});
```

## Features
- **Dynamic Exploration**: Automatically parses Swagger/OpenAPI 3.0 specs.
- **Smart Execution**: Handles path parameters (e.g., `{id}`), query strings, and JSON bodies.
- **Flexible Auth**: Support for standard Bearer tokens and custom Identity headers.
- **Interceptors**: Easily extendable with request hooks for logging or custom headers.
- **Impersonation**: Built-in `set_identity` tool to switch users on the fly.
