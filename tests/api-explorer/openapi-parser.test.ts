import { describe, it, expect, beforeEach } from "@jest/globals";
import { OpenAPIParser } from "../../src/api-explorer/openapi-parser.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(__dirname, "../fixtures/openapi-spec.json");

describe("OpenAPIParser", () => {
  let parser: OpenAPIParser;

  beforeEach(() => {
    parser = new OpenAPIParser();
  });

  it("should successfully parse a valid OpenAPI JSON file", async () => {
    await parser.loadSpec(SPEC_PATH);
    const spec = parser.getSpec() as any;
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info.title).toBe("Example API");
  });

  it("should throw an error for a non-existent spec file", async () => {
    await expect(parser.loadSpec("non-existent.json")).rejects.toThrow();
  });

  it("should correctly extract tags", async () => {
    await parser.loadSpec(SPEC_PATH);
    const tags = parser.getTags();
    expect(tags).toContain("Health");
    expect(tags).toContain("Clients");
    expect(tags).toContain("Hotels");
  });

  it("should correctly extract endpoints", async () => {
    await parser.loadSpec(SPEC_PATH);
    const endpoints = parser.getEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);
    
    const healthApi = endpoints.find(e => e.path === "/health" && e.method === "GET");
    expect(healthApi).toBeDefined();
    expect(healthApi?.summary).toBe("Service health check");
  });

  it("should correctly filter endpoints by tag", async () => {
    await parser.loadSpec(SPEC_PATH);
    const hotels = parser.getEndpointsByTag("Hotels");
    expect(hotels.length).toBeGreaterThan(0);
    expect(hotels.every(e => e.tags?.includes("Hotels"))).toBe(true);
  });

  it("should correctly find a specific endpoint", async () => {
    await parser.loadSpec(SPEC_PATH);
    const endpoint = parser.getEndpoint("GET", "/health");
    expect(endpoint).toBeDefined();
    expect(endpoint?.path).toBe("/health");
    expect(endpoint?.method).toBe("GET");
  });

  it("should keep circular schema refs as $ref instead of inlining them", async () => {
    await parser.loadSpec(SPEC_PATH);
    const spec = parser.getSpec() as any;
    const childrenItems = spec.components.schemas.InventoryItem.properties.children.items;

    expect(childrenItems).toEqual({
      $ref: "#/components/schemas/InventoryItem",
    });
  });

  it("should serialize endpoints with recursive schemas without circular JSON errors", async () => {
    await parser.loadSpec(SPEC_PATH);

    const endpoints = parser.getEndpoints();
    for (const { method, path: endpointPath } of endpoints) {
      const endpoint = parser.getEndpoint(method, endpointPath);
      expect(() => JSON.stringify(endpoint)).not.toThrow();
    }

    const templateEndpoint = parser.getEndpoint("GET", "/hotels/inventory/template");
    expect(templateEndpoint).toBeDefined();
    expect(JSON.parse(JSON.stringify(templateEndpoint))).toMatchObject({
      method: "GET",
      path: "/hotels/inventory/template",
    });
  });

  it("should list schema names from components.schemas", async () => {
    await parser.loadSpec(SPEC_PATH);
    expect(parser.listSchemaNames()).toEqual([
      "ClientResponse",
      "CreateClientOpenApi",
      "InventoryItem",
      "InventorySection",
      "InventoryTemplate",
    ]);
  });

  it("should return schemas by name", async () => {
    await parser.loadSpec(SPEC_PATH);
    const schemas = parser.getSchemas(["CreateClientOpenApi", "ClientResponse"]);

    expect(schemas.CreateClientOpenApi).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
      },
    });
    expect(schemas.ClientResponse).toMatchObject({
      type: "object",
    });
  });

  it("should throw when requesting unknown schema names", async () => {
    await parser.loadSpec(SPEC_PATH);
    expect(() => parser.getSchemas(["DoesNotExist"])).toThrow(
      "Unknown schema(s): DoesNotExist"
    );
  });
});
