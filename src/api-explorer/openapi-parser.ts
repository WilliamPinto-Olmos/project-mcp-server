import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPI } from "openapi-types";

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
  private endpoints: Endpoint[] = [];

  /**
   * Loads and parses an OpenAPI specification from the given file path.
   * @param specPath - Absolute path to the openapi-spec.json file.
   */
  async loadSpec(specPath: string): Promise<void> {
    try {
      this.spec = await SwaggerParser.dereference(specPath);
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
}
