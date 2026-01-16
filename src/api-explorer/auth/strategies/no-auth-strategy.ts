import { AuthStrategy } from "../types.js";

/**
 * Strategy for APIs that do not require any authentication.
 */
export class NoAuthStrategy implements AuthStrategy {
  name = "None";

  getHeaders(): Record<string, string> {
    return {};
  }
}
