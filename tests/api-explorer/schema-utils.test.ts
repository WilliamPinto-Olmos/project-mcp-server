import { describe, it, expect, beforeAll } from "@jest/globals";
import { OpenAPIParser } from "../../src/api-explorer/openapi-parser.js";
import { collectSchemaRefs, withSchemaReference } from "../../src/api-explorer/schema-utils.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(__dirname, "../fixtures/openapi-spec.json");

describe("schema-utils", () => {
  let parser: OpenAPIParser;

  beforeAll(async () => {
    parser = new OpenAPIParser();
    await parser.loadSpec(SPEC_PATH);
  });

  it("should collect nested schema refs from an endpoint", () => {
    const schemaRefs = parser.collectSchemaRefsForEndpoint(
      "GET",
      "/hotels/inventory/template"
    );

    expect(schemaRefs).toEqual([
      "InventoryItem",
      "InventorySection",
      "InventoryTemplate",
    ]);
  });

  it("should collect request and response schema refs", () => {
    const schemaRefs = parser.collectSchemaRefsForEndpoint("POST", "/clients");

    expect(schemaRefs).toEqual(["ClientResponse", "CreateClientOpenApi"]);
  });

  it("should return empty schema refs for endpoints without schemas", () => {
    const endpoint = parser.getEndpoint("GET", "/health")!;
    const schemaRefs = parser.collectSchemaRefsForEndpoint("GET", "/health");
    const enriched = withSchemaReference(endpoint, schemaRefs);

    expect(enriched.schemaRefs).toEqual([]);
    expect(enriched.links).toEqual({});
  });

  it("should add schema links when schemas are referenced", () => {
    const endpoint = parser.getEndpoint("POST", "/clients")!;
    const schemaRefs = parser.collectSchemaRefsForEndpoint("POST", "/clients");
    const enriched = withSchemaReference(endpoint, schemaRefs);

    expect(enriched.schemaRefs).toEqual(["ClientResponse", "CreateClientOpenApi"]);
    expect(enriched.links).toEqual({
      schemas: {
        tool: "api_get_schemas",
        params: { names: ["ClientResponse", "CreateClientOpenApi"] },
      },
    });
  });
});
