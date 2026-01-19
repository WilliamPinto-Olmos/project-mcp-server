// API Explorer module exports
export { OpenAPIParser } from "./openapi-parser.js";
export { ToolGenerator } from "./tool-generator.js";
export { ApiExecutor } from "./api-executor.js";

// Auth exports
export * from "./auth/index.js";

import { AuthContext } from "./auth/index.js";

/**
 * Configuration for the API Explorer.
 */
export interface ApiConfig {
  /**
   * Optional custom authentication context.
   * If not provided, it will be created from environment variables.
   */
  authContext?: AuthContext;
  /**
   * The target API base URL.
   * If not provided, it will default to env.PROJECT_MCP_API_BASE_URL or "http://localhost:5000".
   */
  baseUrl?: string;
}
