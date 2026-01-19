import { DbConfig } from "./types.js";
export { DbExecutor } from "./db-executor.js";
export { DbToolGenerator } from "./db-tool-generator.js";
export type { DbConfig } from "./types.js";

export * from "./types.js";

export * from "./drivers/index.js";

export function createDbConfigFromEnv(): DbConfig {
  return {
    driver: process.env.PROJECT_MCP_DB_DRIVER as "mysql" || "mysql",
    host: process.env.PROJECT_MCP_DB_HOST || "localhost",
    port: parseInt(process.env.PROJECT_MCP_DB_PORT || "3306", 10),
    user: process.env.PROJECT_MCP_DB_USER || "",
    password: process.env.PROJECT_MCP_DB_PASSWORD || "",
    database: process.env.PROJECT_MCP_DB_DATABASE || "",
    poolSize: parseInt(process.env.PROJECT_MCP_DB_POOL_SIZE || "10", 10),
    enableRunQuery: process.env.PROJECT_MCP_DB_ENABLE_QUERY !== "false",
    enableRunUpdateStatement: process.env.PROJECT_MCP_DB_ENABLE_UPDATE !== "false",
    enableRunDeleteStatement: process.env.PROJECT_MCP_DB_ENABLE_DELETE === "true",
    enableRunStatement: process.env.PROJECT_MCP_DB_ENABLE_STATEMENT === "true",
  };
}
