import { describe, it, expect } from "@jest/globals";
import { BearerStrategy } from "../../src/api-explorer/auth/strategies/bearer-strategy.js";
import { IdentityStrategy } from "../../src/api-explorer/auth/strategies/identity-strategy.js";
import { NoAuthStrategy } from "../../src/api-explorer/auth/strategies/no-auth-strategy.js";
import { GlobalAuthContext } from "../../src/api-explorer/auth/auth-context.js";

describe("Auth Strategies", () => {
  describe("BearerStrategy", () => {
    it("should return Authorization header with bearer token", () => {
      const strategy = new BearerStrategy("token123");
      const headers = strategy.getHeaders();
      expect(headers).toEqual({ Authorization: "Bearer token123" });
    });

    it("should return empty headers if no token", () => {
      const strategy = new BearerStrategy("");
      const headers = strategy.getHeaders();
      expect(headers).toEqual({});
    });
  });

  describe("IdentityStrategy", () => {
    it("should return custom identity header", () => {
      const strategy = new IdentityStrategy("X-User-ID", "UID", "user123");
      const headers = strategy.getHeaders();
      expect(headers).toEqual({ "X-User-ID": "UID user123" });
    });

    it("should work without identifiable prefix", () => {
      const strategy = new IdentityStrategy("X-API-Key", "", "key-456");
      const headers = strategy.getHeaders();
      expect(headers).toEqual({ "X-API-Key": "key-456" });
    });

    it("should allow changing identifier", () => {
      const strategy = new IdentityStrategy("Auth", "ID", "1");
      strategy.setIdentifier("2");
      expect(strategy.getHeaders()).toEqual({ Auth: "ID 2" });
    });
  });

  describe("NoAuthStrategy", () => {
    it("should return empty headers", () => {
      const strategy = new NoAuthStrategy();
      expect(strategy.getHeaders()).toEqual({});
    });
  });

  describe("GlobalAuthContext", () => {
    it("should update identifier if strategy is IdentityStrategy", async () => {
      const strategy = new IdentityStrategy("UID-Header", "UID", "old");
      const context = new GlobalAuthContext(strategy);
      context.setIdentifier("new");
      expect(await context.getHeaders()).toEqual({ "UID-Header": "UID new" });
    });
  });
});
