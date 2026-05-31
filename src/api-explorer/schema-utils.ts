import type { Endpoint } from "./openapi-parser.js";

const COMPONENT_SCHEMA_REF = /^#\/components\/schemas\/(.+)$/;

function extractSchemaName(ref: string): string | undefined {
  const match = ref.match(COMPONENT_SCHEMA_REF);
  return match?.[1];
}

function collectSchemaNamesFromValue(value: unknown, names: Set<string>): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectSchemaNamesFromValue(item, names));
    return;
  }

  const obj = value as Record<string, unknown>;
  if (typeof obj.$ref === "string") {
    const name = extractSchemaName(obj.$ref);
    if (name) {
      names.add(name);
    }
  }

  Object.values(obj).forEach((item) => collectSchemaNamesFromValue(item, names));
}

export function collectSchemaRefs(
  endpoint: Endpoint,
  componentSchemas: Record<string, unknown>
): string[] {
  const discovered = new Set<string>();
  const queue: string[] = [];

  const fromEndpoint = new Set<string>();
  collectSchemaNamesFromValue(endpoint.parameters, fromEndpoint);
  collectSchemaNamesFromValue(endpoint.requestBody, fromEndpoint);
  collectSchemaNamesFromValue(endpoint.responses, fromEndpoint);

  fromEndpoint.forEach((name) => {
    discovered.add(name);
    queue.push(name);
  });

  while (queue.length > 0) {
    const name = queue.shift()!;
    const schema = componentSchemas[name];
    if (!schema) {
      continue;
    }

    const nested = new Set<string>();
    collectSchemaNamesFromValue(schema, nested);
    nested.forEach((nestedName) => {
      if (!discovered.has(nestedName)) {
        discovered.add(nestedName);
        queue.push(nestedName);
      }
    });
  }

  return Array.from(discovered).sort();
}

export function withSchemaReference(
  endpoint: Endpoint,
  schemaRefs: string[]
): Endpoint & {
  schemaRefs: string[];
  links: {
    schemas?: {
      tool: string;
      params: { names: string[] };
    };
  };
} {
  if (schemaRefs.length === 0) {
    return {
      ...endpoint,
      schemaRefs,
      links: {},
    };
  }

  return {
    ...endpoint,
    schemaRefs,
    links: {
      schemas: {
        tool: "api_get_schemas",
        params: { names: schemaRefs },
      },
    },
  };
}
