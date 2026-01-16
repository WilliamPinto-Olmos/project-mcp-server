import { AuthStrategy } from "../types.js";

/**
 * Highly flexible authentication strategy for custom headers and identifiers.
 * Useful for scenarios like "Authorization: UID <identifier>" or "X-API-Key: <key>".
 */
export class IdentityStrategy implements AuthStrategy {
  name = "Identity";
  private currentIdentifier: string;

  constructor(
    private headerKey: string,
    private identifiable: string,
    initialIdentifier: string
  ) {
    this.currentIdentifier = initialIdentifier;
  }

  setIdentifier(value: string) {
    this.currentIdentifier = value;
  }

  getIdentifier(): string {
    return this.currentIdentifier;
  }

  getHeaders(): Record<string, string> {
    if (!this.currentIdentifier) return {};
    
    const value = this.identifiable 
      ? `${this.identifiable} ${this.currentIdentifier}`
      : this.currentIdentifier;

    return {
      [this.headerKey]: value,
    };
  }
}
