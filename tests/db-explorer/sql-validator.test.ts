import { SqlValidator } from "../../src/db-explorer/sql-validator.js";

describe("SqlValidator", () => {
  describe("Keyword Blocking", () => {
    it("should block keywords case-insensitively", () => {
      expect(() => SqlValidator.validate("update users set x=1", ["UPDATE"]))
        .toThrow("Forbidden keyword detected: UPDATE");
    });

    it("should not be fooled by keywords in strings", () => {
      expect(() => SqlValidator.validate("SELECT 'this is an UPDATE' as msg", ["UPDATE"]))
        .not.toThrow();
    });

    it("should not be fooled by keywords in comments", () => {
      expect(() => SqlValidator.validate("SELECT * FROM users -- do not UPDATE", ["UPDATE"]))
        .not.toThrow();
    });

    it("should handle multi-line queries", () => {
      expect(() => SqlValidator.validate("SELECT *\nFROM users\nWHERE id=1", ["DELETE"]))
        .not.toThrow();
      expect(() => SqlValidator.validate("SELECT *\nFROM users;\nDELETE FROM logs;", ["DELETE"]))
        .toThrow("Forbidden keyword detected: DELETE");
    });
  });
});
