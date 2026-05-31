import { OpenAPIParser } from "./openapi-parser.js";
import { withSchemaReference } from "./schema-utils.js";
import { z } from "zod";

export interface ToolConfig {
  name: string;
  description: string;
  inputSchema?: z.ZodType<any>;
}

/**
 * Service that maps OpenAPI endpoints to MCP-compatible tool definitions.
 * It provides the metadata for tools that an LLM can use to explore and interact with the API.
 */
export class ToolGenerator {
  /**
   * @param parser - The OpenAPIParser instance containing the parsed spec.
   */
  constructor(private parser: OpenAPIParser) {}

  /**
   * Returns a dictionary of tool definitions with their descriptions and Zod input schemas.
   * These definitions are used by MCPServer to register tools with the SDK.
   */
  getToolDefinitions() {
    return {
      api_get_tags: {
        description: "Get all unique tags defined in the API spec. This helps to group and discover endpoints.",
      },
      api_get_tag_endpoints: {
        description: "Get all endpoints associated with a specific tag. Returns a summary of each endpoint.",
        inputSchema: z.object({
          tag: z.string().describe("The tag to filter endpoints by."),
        }),
      },
      api_get_tags_endpoints: {
        description: "Get all endpoints associated with multiple tags. Returns a summary of each endpoint.",
        inputSchema: z.object({
          tags: z.array(z.string()).describe("The tags to filter endpoints by."),
        }),
      },
      api_get_all_endpoints: {
        description: "Get a summarized list of all endpoints available in the API.",
      },
      api_get_endpoint: {
        description: "Get detailed information about a specific endpoint, including parameters, request/response schemas ($ref), schemaRefs, and links to resolve schemas via api_get_schemas.",
        inputSchema: z.object({
          method: z.string().describe("The HTTP method (GET, POST, etc.)."),
          path: z.string().describe("The endpoint path."),
        }),
      },
      api_get_endpoints: {
        description: "Get detailed information for multiple specific endpoints.",
        inputSchema: z.object({
          requests: z.array(
            z.object({
              method: z.string(),
              path: z.string(),
            })
          ).describe("List of endpoint requests."),
        }),
      },
      api_list_schemas: {
        description: "List all schema names defined in components.schemas of the OpenAPI spec.",
      },
      api_get_schemas: {
        description: "Get full schema definitions by name. Use when an endpoint response includes schema $ref pointers and you need their structure.",
        inputSchema: z.object({
          names: z.array(z.string()).describe("Schema names to retrieve (e.g. CreateClientOpenApi)."),
        }),
      },
      api_call_endpoint: {
        description: "Execute a request to a project's endpoint using the specified parameters and body.",
        inputSchema: z.object({
          method: z.string().describe("The HTTP method."),
          path: z.string().describe("The endpoint path (e.g., /projects/{id})."),
          parameters: z.record(z.string(), z.any()).optional().describe("Path and query parameters (mapped by name)."),
          body: z.any().optional().describe("The request body payload."),
        }),
      },
    };
  }

  private enrichEndpoint(endpoint: ReturnType<OpenAPIParser["getEndpoint"]>) {
    if (!endpoint) return endpoint;
    const schemaRefs = this.parser.collectSchemaRefsForEndpoint(endpoint.method, endpoint.path);
    return withSchemaReference(endpoint, schemaRefs);
  }

  handleToolCall(name: string, args: any) {
    switch (name) {
      case "api_get_tags":
        return this.parser.getTags();
      case "api_get_tag_endpoints":
        return this.parser.getEndpointsByTag(args.tag).map(e => ({
          method: e.method,
          path: e.path,
          summary: e.summary,
        }));
      case "api_get_tags_endpoints":
        return this.parser.getEndpointsByTags(args.tags).map(e => ({
          method: e.method,
          path: e.path,
          summary: e.summary,
        }));
      case "api_get_all_endpoints":
        return this.parser.getEndpoints().map(e => ({
          method: e.method,
          path: e.path,
          summary: e.summary,
        }));
      case "api_get_endpoint":
        return this.enrichEndpoint(this.parser.getEndpoint(args.method, args.path));
      case "api_get_endpoints":
        return args.requests.map((r: any) =>
          this.enrichEndpoint(this.parser.getEndpoint(r.method, r.path))
        );
      case "api_list_schemas":
        return this.parser.listSchemaNames();
      case "api_get_schemas":
        return this.parser.getSchemas(args.names);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
