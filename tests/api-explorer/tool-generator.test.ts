import { describe, it, expect, beforeAll } from "@jest/globals";
import { ToolGenerator } from "../../src/api-explorer/tool-generator.js";
import { OpenAPIParser } from "../../src/api-explorer/openapi-parser.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(__dirname, "../fixtures/openapi-spec.json");

describe("ToolGenerator", () => {
  let parser: OpenAPIParser;
  let toolGenerator: ToolGenerator;

  beforeAll(async () => {
    parser = new OpenAPIParser();
    await parser.loadSpec(SPEC_PATH);
    toolGenerator = new ToolGenerator(parser);
  });

  it("should return the list of meta-tools", () => {
    const definitions = toolGenerator.getToolDefinitions();
    const names = Object.keys(definitions);
    expect(names.length).toBe(9);
    expect(names).toContain("api_get_tags");
    expect(names).toContain("api_call_endpoint");
    expect(names).toContain("api_list_schemas");
    expect(names).toContain("api_get_schemas");
  });

  it("should handle api_get_tags", () => {
    const response = toolGenerator.handleToolCall("api_get_tags", {});
    expect(response).toContain("Hotels");
  });

  it("should handle api_get_tag_endpoints", () => {
    const response = toolGenerator.handleToolCall("api_get_tag_endpoints", { tag: "Hotels" });
    const endpoints = response as any[];
    expect(endpoints.length).toBeGreaterThan(0);
    expect(endpoints.every((e: any) => e.method && e.path)).toBe(true);
    expect(endpoints[0]).toHaveProperty("summary");
  });

  it("should handle api_get_endpoint", () => {
    const response = toolGenerator.handleToolCall("api_get_endpoint", { method: "GET", path: "/health" });
    const endpoint = response as any;
    expect(endpoint.path).toBe("/health");
    expect(endpoint.method).toBe("GET");
    expect(endpoint.schemaRefs).toEqual([]);
    expect(endpoint.links).toEqual({});
  });

  it("should enrich api_get_endpoint with schemaRefs and links", () => {
    const response = toolGenerator.handleToolCall("api_get_endpoint", {
      method: "POST",
      path: "/clients",
    }) as any;

    expect(response.schemaRefs).toEqual(["ClientResponse", "CreateClientOpenApi"]);
    expect(response.links.schemas).toEqual({
      tool: "api_get_schemas",
      params: { names: ["ClientResponse", "CreateClientOpenApi"] },
    });
  });

  it("should handle api_list_schemas", () => {
    const response = toolGenerator.handleToolCall("api_list_schemas", {});
    expect(response).toContain("InventoryItem");
    expect(response).toContain("CreateClientOpenApi");
  });

  it("should handle api_get_schemas", () => {
    const response = toolGenerator.handleToolCall("api_get_schemas", {
      names: ["CreateClientOpenApi"],
    }) as any;

    expect(response.CreateClientOpenApi).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
      },
    });
  });

  it("should throw for unknown schema names in api_get_schemas", () => {
    expect(() =>
      toolGenerator.handleToolCall("api_get_schemas", { names: ["MissingSchema"] })
    ).toThrow("Unknown schema(s): MissingSchema");
  });

  it("should return serializable endpoint details for recursive inventory schemas", () => {
    const response = toolGenerator.handleToolCall("api_get_endpoint", {
      method: "GET",
      path: "/hotels/inventory/template",
    });
    expect(() => JSON.stringify(response)).not.toThrow();
  });
});
