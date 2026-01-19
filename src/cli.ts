#!/usr/bin/env node
import "dotenv/config";
import { MCPServer } from "./mcp-server.js";
import path from "path";

const specPath = process.env.PROJECT_MCP_OPENAPI_SPEC || path.resolve(process.cwd(), "openapi-spec.json");

const server = new MCPServer({
  specPath
});

server.start().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
