import { describe, it, expect, beforeEach, beforeAll } from "@jest/globals";
import { ToolGenerator } from "../../src/api-explorer/tool-generator.js";
import { OpenAPIParser } from "../../src/api-explorer/openapi-parser.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(__dirname, "../../openapi-spec.json");

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
    expect(names.length).toBe(7);
    expect(names).toContain("api_get_tags");
    expect(names).toContain("api_call_endpoint");
  });

  it("should handle api_get_tags", () => {
    const response = toolGenerator.handleToolCall("api_get_tags", {});
    expect(response).toContain("Projects");
  });

  it("should handle api_get_tag_endpoints", () => {
    const response = toolGenerator.handleToolCall("api_get_tag_endpoints", { tag: "Projects" });
    const endpoints = response as any[];
    expect(endpoints.length).toBeGreaterThan(0);
    expect(endpoints.every((e: any) => e.method && e.path)).toBe(true);
    expect(endpoints[0]).toHaveProperty("summary");
  });

  it("should handle api_get_endpoint", () => {
    const response = toolGenerator.handleToolCall("api_get_endpoint", { method: "GET", path: "/project-api" });
    const endpoint = response as any;
    expect(endpoint.path).toBe("/project-api");
    expect(endpoint.method).toBe("GET");
  });
});
