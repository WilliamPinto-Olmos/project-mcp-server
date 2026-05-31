import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPI } from "openapi-types";
import { collectSchemaRefs } from "./schema-utils.js";

export interface Endpoint {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: any;
}

/**
 * Service responsible for loading, parsing, and extracting data from OpenAPI specifications.
 * Uses @apidevtools/swagger-parser for robust dereferencing and validation.
 */
export class OpenAPIParser {
  private spec: OpenAPI.Document | null = null;
  private bundledSpec: OpenAPI.Document | null = null;
  private endpoints: Endpoint[] = [];

  /**
   * Loads and parses an OpenAPI specification from the given file path.
   * @param specPath - Absolute path to the openapi-spec.json file.
   */
  async loadSpec(specPath: string): Promise<void> {
    try {
      this.bundledSpec = await SwaggerParser.bundle(specPath);
      this.spec = await SwaggerParser.dereference(specPath, {
        dereference: { circular: "ignore" },
      });
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getSpec(): OpenAPI.Document {
    if (!this.spec) {
      throw new Error("Spec not loaded. Call loadSpec() first.");
    }
    return this.spec;
  }

  getTags(): string[] {
    const spec = this.getSpec();
    const tags = new Set<string>();
    
    if ('tags' in spec && spec.tags) {
      spec.tags.forEach((tag: any) => tags.add(tag.name));
    }

    if ('paths' in spec && spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        if (!pathItem) return;
        ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
          const operation = (pathItem as any)[method];
          if (operation && operation.tags) {
            operation.tags.forEach((tag: string) => tags.add(tag));
          }
        });
      });
    }

    return Array.from(tags).sort();
  }

  getEndpoints(): Endpoint[] {
    const spec = this.getSpec();
    const endpoints: Endpoint[] = [];

    if ('paths' in spec && spec.paths) {
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        if (!pathItem) return;
        ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
          const operation = (pathItem as any)[method];
          if (operation) {
            endpoints.push({
              method: method.toUpperCase(),
              path,
              operationId: operation.operationId,
              summary: operation.summary,
              description: operation.description,
              tags: operation.tags,
              parameters: operation.parameters,
              requestBody: operation.requestBody,
              responses: operation.responses,
            });
          }
        });
      });
    }

    return endpoints;
  }

  getEndpointsByTag(tag: string): Endpoint[] {
    return this.getEndpoints().filter((endpoint) => endpoint.tags?.includes(tag));
  }

  getEndpointsByTags(tags: string[]): Endpoint[] {
    return this.getEndpoints().filter((endpoint) => 
      endpoint.tags?.some((t) => tags.includes(t))
    );
  }

  getEndpoint(method: string, path: string): Endpoint | undefined {
    return this.getEndpoints().find(
      (e) => e.method === method.toUpperCase() && e.path === path
    );
  }

  collectSchemaRefsForEndpoint(method: string, path: string): string[] {
    const pathItem = this.bundledSpec?.paths?.[path] as Record<string, unknown> | undefined;
    const operation = pathItem?.[method.toLowerCase()] as Record<string, unknown> | undefined;

    if (!operation) {
      return [];
    }

    const endpoint: Endpoint = {
      method: method.toUpperCase(),
      path,
      parameters: operation.parameters as Endpoint["parameters"],
      requestBody: operation.requestBody,
      responses: operation.responses,
    };

    return collectSchemaRefs(endpoint, this.getComponentSchemas());
  }

  getComponentSchemas(): Record<string, unknown> {
    const spec = this.getSpec() as any;
    return spec.components?.schemas ?? {};
  }

  listSchemaNames(): string[] {
    return Object.keys(this.getComponentSchemas()).sort();
  }

  getSchemas(names: string[]): Record<string, unknown> {
    const schemas = this.getComponentSchemas();
    const missing = names.filter((name) => !(name in schemas));

    if (missing.length > 0) {
      throw new Error(`Unknown schema(s): ${missing.join(", ")}`);
    }

    return Object.fromEntries(names.map((name) => [name, schemas[name]]));
  }
}
