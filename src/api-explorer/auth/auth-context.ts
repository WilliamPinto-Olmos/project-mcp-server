import { AuthContext, AuthStrategy, isIdentifiable } from "./types.js";
import { BearerStrategy } from "./strategies/bearer-strategy.js";
import { IdentityStrategy } from "./strategies/identity-strategy.js";
import { NoAuthStrategy } from "./strategies/no-auth-strategy.js";

/**
 * Standard implementation of AuthContext that wraps an AuthStrategy.
 * Handles runtime identifier updates for identity-based strategies.
 */
export class GlobalAuthContext implements AuthContext {
  /**
   * @param strategy - The initial authentication strategy to use.
   */
  constructor(public strategy: AuthStrategy) {}

  setIdentifier(value: string): void {
    if (isIdentifiable(this.strategy)) {
      this.strategy.setIdentifier(value);
    } else {
      console.error(`Current strategy ${this.strategy.name} does not support setting an identifier.`);
    }
  }

  getIdentifier(): string {
    if (isIdentifiable(this.strategy)) {
      return this.strategy.getIdentifier();
    }
    return "";
  }

  async getHeaders(): Promise<Record<string, string>> {
    return await this.strategy.getHeaders();
  }
}

export function createAuthContextFromEnv(): AuthContext {
  const authType = process.env.PROJECT_MCP_AUTH_TYPE || "bearer";

  let strategy: AuthStrategy;

  switch (authType.toLowerCase()) {
    case "identity":
      strategy = new IdentityStrategy(
        process.env.PROJECT_MCP_AUTH_HEADER_KEY || "Authorization",
        process.env.PROJECT_MCP_AUTH_IDENTIFIABLE || "UID:",
        process.env.PROJECT_MCP_AUTH_IDENTIFIER || ""
      );
      break;
    case "bearer":
      strategy = new BearerStrategy(process.env.PROJECT_MCP_API_BEARER_TOKEN || "");
      break;
    case "none":
    default:
      strategy = new NoAuthStrategy();
      break;
  }

  return new GlobalAuthContext(strategy);
}
