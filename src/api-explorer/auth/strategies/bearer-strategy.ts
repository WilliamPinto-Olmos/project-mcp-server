import { AuthStrategy } from "../types.js";

/**
 * Authentication strategy that uses a standard Authorization: Bearer <token> header.
 */
export class BearerStrategy implements AuthStrategy {
  name = "Bearer";

  constructor(private token: string) {}

  getHeaders(): Record<string, string> {
    if (!this.token) return {};
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }
}
