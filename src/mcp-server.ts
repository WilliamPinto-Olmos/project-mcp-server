import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { OpenAPIParser } from "./api-explorer/openapi-parser.js";
import { ToolGenerator } from "./api-explorer/tool-generator.js";
import { ApiExecutor } from "./api-explorer/api-executor.js";
import { AuthContext, createAuthContextFromEnv } from "./api-explorer/auth/index.js";
import { DbExecutor, DbToolGenerator } from "./db-explorer/index.js";
import type { DbConfig } from "./db-explorer/index.js";
import { MySQLDriver } from "./db-explorer/drivers/mysql-driver.js";


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
  specPath: string;
  authContext?: AuthContext;
  dbConfig?: DbConfig;
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
  private parser: OpenAPIParser;
  private toolGenerator: ToolGenerator;
  private apiExecutor: ApiExecutor;
  private authContext: AuthContext;
  private dbExecutor?: DbExecutor;
  private dbToolGenerator?: DbToolGenerator;
  private specPath: string;

  /**
   * @param options - Configuration options for the MCP Server.
   */
  constructor(options: MCPServerOptions) {
    this.specPath = options.specPath;
    this.parser = new OpenAPIParser();
    this.toolGenerator = new ToolGenerator(this.parser);
    this.authContext = options.authContext || createAuthContextFromEnv();
    this.apiExecutor = new ApiExecutor(undefined, this.authContext);

    if (options.dbConfig) {
      const driver = new MySQLDriver(options.dbConfig);
      this.dbExecutor = new DbExecutor(driver, options.dbConfig);
      this.dbToolGenerator = new DbToolGenerator(this.dbExecutor);
    }

    this.server = new McpServer({
      name: "project-mcp-server",
      version: "1.0.0",
    });
  }

  private async initParser() {
    try {
      await this.parser.loadSpec(this.specPath);
      console.error(`Loaded OpenAPI spec from ${this.specPath}`);
      
      if (this.dbExecutor) {
        await this.dbExecutor.connect();
      }

      this.registerTools();
    } catch (error) {
      console.error(`Failed to load OpenAPI spec: ${error}`);
      process.exit(1);
    }
  }

  private registerTools() {
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
            if (name === "call_endpoint") {
              result = await this.apiExecutor.callEndpoint(args);
            } else {
              result = this.toolGenerator.handleToolCall(name, args);
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


    this.server.registerTool(
      "set_identity",
      {
        description: "Set the identity (identifier) for future API requests. Requires an 'identity' auth strategy to be active.",
        inputSchema: z.object({
          identifier: z.string().describe("The new identity value (e.g., user UID)."),
        }),
      },
      async ({ identifier }) => {
        try {
          this.authContext.setIdentifier(identifier);
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

  /**
   * Starts the MCP server on Stdio transport.
   * This method ensures the OpenAPI spec is loaded and tools are registered before connecting.
   */
  async start() {
    await this.initParser();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("OpenAPI MCP server running on stdio");
  }
}
