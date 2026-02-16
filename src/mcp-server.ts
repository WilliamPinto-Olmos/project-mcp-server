import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { z } from "zod";
import { OpenAPIParser } from "./api-explorer/openapi-parser.js";
import { ToolGenerator } from "./api-explorer/tool-generator.js";
import { ApiExecutor } from "./api-explorer/api-executor.js";
import { ApiConfig } from "./api-explorer/index.js";
import { AuthContext, createAuthContextFromEnv } from "./api-explorer/auth/index.js";
import { createDbConfigFromEnv, DbExecutor, DbToolGenerator } from "./db-explorer/index.js";
import type { DatabaseConfig } from "./db-explorer/index.js";


export type { ApiConfig };

/**
 * The main MCP Server implementation that coordinates the OpenAPI parser, 
 * tool generation, and API execution.
 * 
 * It registers meta-tools that allow LLMs to:
 * 1. Discover API structure (tags, endpoints, schemas).
 * 2. Execute calls to any endpoint with dynamic authentication.
 * 3. Impersonate users via the set_identity tool.
 */
export interface MCPServerOptions {
  specPath?: string;
  api?: ApiConfig;
  database?: DatabaseConfig;
}

/**
 * The main MCP Server implementation that coordinates the OpenAPI parser, 
 * tool generation, and API execution.
 * 
 * It registers meta-tools that allow LLMs to:
 * 1. Discover API structure (tags, endpoints, schemas).
 * 2. Execute calls to any endpoint with dynamic authentication.
 * 3. Impersonate users via the set_identity tool.
 */
export class MCPServer {
  private server: McpServer;
  private parser?: OpenAPIParser;
  private toolGenerator?: ToolGenerator;
  private apiExecutor?: ApiExecutor;
  private authContext?: AuthContext;
  private dbExecutor?: DbExecutor;
  private dbToolGenerator?: DbToolGenerator;
  private specPath?: string;
  private transport?: Transport;
  private options: MCPServerOptions;

  /**
   * @param options - Configuration options for the MCP Server.
   */
  constructor(options: MCPServerOptions) {
    this.options = options;
    this.specPath = options.specPath;
    
    if (this.specPath) {
      this.parser = new OpenAPIParser();
      this.toolGenerator = new ToolGenerator(this.parser);
      this.authContext = options.api?.authContext || createAuthContextFromEnv();
      const apiBaseUrl = options.api?.baseUrl;
      this.apiExecutor = new ApiExecutor(apiBaseUrl, this.authContext);
    }

    const dbConfig = 'database' in options ? options.database : createDbConfigFromEnv();
    
    if (dbConfig) {
      this.dbExecutor = new DbExecutor(dbConfig.driver, dbConfig.permissions);
      this.dbToolGenerator = new DbToolGenerator(dbConfig.driver, dbConfig.permissions);
    }

    this.server = new McpServer({
      name: "project-mcp-server",
      version: "1.0.0",
    });
  }

  private async initApiExplorer() {
    if (!this.parser || !this.specPath) return;

    try {
      await this.parser.loadSpec(this.specPath);
      console.error(`Loaded OpenAPI spec from ${this.specPath}`);
    } catch (error) {
      console.error(`Failed to load OpenAPI spec: ${error}`);
      process.exit(1);
    }
  }

  private async initDatabase() {
    if (this.dbExecutor) {
      try {
        await this.dbExecutor.connect();
        console.error("Connected to database");
      } catch (error) {
        console.error(`Failed to connect to database: ${error}`);
      }
    }
  }

  private registerTools() {
    if (this.toolGenerator && this.apiExecutor) {
      const definitions = this.toolGenerator.getToolDefinitions();

      Object.entries(definitions).forEach(([name, def]) => {
        this.server.registerTool(
          name,
          {
            description: def.description,
            inputSchema: (def as any).inputSchema,
          },
          async (args: any) => { 
            try {
              let result;
              if (name === "api_call_endpoint") {
                result = await this.apiExecutor!.callEndpoint(args);
              } else {
                result = this.toolGenerator!.handleToolCall(name, args);
              }
              return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
              };
            } catch (error: any) {
              return {
                content: [{ type: "text" as const, text: `Error: ${error.message}` }],
                isError: true,
              };
            }
          }
        );
      });
    }

    if (this.dbToolGenerator) {
      const dbDefinitions = this.dbToolGenerator.getToolDefinitions();

      Object.entries(dbDefinitions).forEach(([name, def]) => {
        const toolDef = def as any;
        this.server.registerTool(
          name,
          {
            description: toolDef.description,
            inputSchema: toolDef.inputSchema,
          },

          async (args: any) => {
            try {
              const result = await this.dbToolGenerator!.handleToolCall(name, args);
              return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
              };
            } catch (error: any) {
              return {
                content: [{ type: "text" as const, text: `Error: ${error.message}` }],
                isError: true,
              };
            }
          }
        );
      });
    }


    if (this.authContext) {
      this.server.registerTool(
        "api_set_identity",
        {
          description: "Set the identity (identifier) for future API requests. Requires an 'identity' auth strategy to be active.",
          inputSchema: z.object({
            identifier: z.string().describe("The new identity value (e.g., user UID)."),
          }),
        },
        async ({ identifier }) => {
          try {
            this.authContext!.setIdentifier(identifier);
            return {
              content: [{ type: "text" as const, text: `Successfully updated identity to: ${identifier}` }],
            };
          } catch (error: any) {
            return {
              content: [{ type: "text" as const, text: `Error: ${error.message}` }],
              isError: true,
            };
          }
        }
      );
    }
  }

  async start() {
    await this.initApiExplorer();
    await this.initDatabase();
    
    this.registerTools();

    if (!this.transport) {
      this.transport = new StdioServerTransport();
    }
    
    await this.server.connect(this.transport);
    console.error("OpenAPI MCP server running on stdio");
  }

  /**
   * Stops the MCP server and disconnects any database connections.
   */
  async stop() {
    if (this.dbExecutor) {
      await this.dbExecutor.disconnect();
    }
    await this.server.close();
    this.transport = undefined;
    console.error("MCP server stopped");
  }

  /**
   * Reloads the MCP server by stopping it and starting it again.
   * This will re-initialize the OpenAPI parser and database connection.
   */
  async reload() {
    await this.stop();
    
    this.server = new McpServer({
      name: "project-mcp-server",
      version: "1.0.0",
    });
    
    await this.start();
    console.error("MCP server reloaded");
  }
}
