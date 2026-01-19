#!/usr/bin/env node
import { MCPServer } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const specPath = process.env.PROJECT_MCP_OPENAPI_SPEC || path.resolve(process.cwd(), "openapi-spec.json");

let dbConfig: any = undefined;
if (process.env.PROJECT_MCP_DB_HOST) {
  dbConfig = {
    driver: process.env.PROJECT_MCP_DB_DRIVER || "mysql",
    host: process.env.PROJECT_MCP_DB_HOST || "localhost",
    port: parseInt(process.env.PROJECT_MCP_DB_PORT || "3306", 10),
    user: process.env.PROJECT_MCP_DB_USER,
    password: process.env.PROJECT_MCP_DB_PASSWORD,
    database: process.env.PROJECT_MCP_DB_DATABASE,
    poolSize: parseInt(process.env.PROJECT_MCP_DB_POOL_SIZE || "10", 10),
    enableRunQuery: process.env.PROJECT_MCP_DB_ENABLE_QUERY !== "false",
    enableRunUpdateStatement: process.env.PROJECT_MCP_DB_ENABLE_UPDATE !== "false",
    enableRunDeleteStatement: process.env.PROJECT_MCP_DB_ENABLE_DELETE === "true",
    enableRunStatement: process.env.PROJECT_MCP_DB_ENABLE_STATEMENT === "true",
  };
}

const server = new MCPServer(specPath, undefined, dbConfig);

server.start().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
