import { describe, it, expect, beforeEach } from "@jest/globals";
import { OpenAPIParser } from "../../src/api-explorer/openapi-parser.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = path.resolve(__dirname, "../../openapi-spec.json");

describe("OpenAPIParser", () => {
  let parser: OpenAPIParser;

  beforeEach(() => {
    parser = new OpenAPIParser();
  });

  it("should successfully parse a valid OpenAPI JSON file", async () => {
    await parser.loadSpec(SPEC_PATH);
    const spec = parser.getSpec() as any;
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toBe("Aika Backend API");
  });

  it("should throw an error for a non-existent spec file", async () => {
    await expect(parser.loadSpec("non-existent.json")).rejects.toThrow();
  });

  it("should correctly extract tags", async () => {
    await parser.loadSpec(SPEC_PATH);
    const tags = parser.getTags();
    expect(tags).toContain("Projects");
    expect(tags).toContain("Tasks");
    expect(tags).toContain("TeamMembers");
  });

  it("should correctly extract endpoints", async () => {
    await parser.loadSpec(SPEC_PATH);
    const endpoints = parser.getEndpoints();
    expect(endpoints.length).toBeGreaterThan(0);
    
    const projectApi = endpoints.find(e => e.path === "/project-api" && e.method === "GET");
    expect(projectApi).toBeDefined();
    expect(projectApi?.summary).toBe("List all projects");
  });

  it("should correctly filter endpoints by tag", async () => {
    await parser.loadSpec(SPEC_PATH);
    const projects = parser.getEndpointsByTag("Projects");
    expect(projects.length).toBeGreaterThan(0);
    expect(projects.every(e => e.tags?.includes("Projects"))).toBe(true);
  });

  it("should correctly find a specific endpoint", async () => {
    await parser.loadSpec(SPEC_PATH);
    const endpoint = parser.getEndpoint("GET", "/project-api");
    expect(endpoint).toBeDefined();
    expect(endpoint?.path).toBe("/project-api");
    expect(endpoint?.method).toBe("GET");
  });
});
