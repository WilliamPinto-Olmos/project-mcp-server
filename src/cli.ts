#!/usr/bin/env node
import { MCPServer } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SPEC_PATH = path.resolve(__dirname, "../openapi-spec.json");

const specPath = process.argv[2] || DEFAULT_SPEC_PATH;

const server = new MCPServer(specPath);

server.start().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});
