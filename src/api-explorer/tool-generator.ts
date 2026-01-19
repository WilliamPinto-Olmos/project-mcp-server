import { OpenAPIParser } from "./openapi-parser.js";
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
        description: "Get detailed information about a specific endpoint, including parameters and request body schema.",
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

  handleToolCall(name: string, args: any) {
    switch (name) {
      case "api_get_tags":
        return this.parser.getTags();
      case "api_get_tag_endpoints":
        return this.parser.getEndpointsByTag(args.tag);
      case "api_get_tags_endpoints":
        return this.parser.getEndpointsByTags(args.tags);
      case "api_get_all_endpoints":
        return this.parser.getEndpoints();
      case "api_get_endpoint":
        return this.parser.getEndpoint(args.method, args.path);
      case "api_get_endpoints":
        return args.requests.map((r: any) => this.parser.getEndpoint(r.method, r.path));
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
