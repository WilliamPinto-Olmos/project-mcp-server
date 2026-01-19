import { jest } from "@jest/globals";
import { DbExecutor } from "../../src/db-explorer/db-executor.js";
import { DbDriver, DbConfig } from "../../src/db-explorer/types.js";

describe("DbExecutor", () => {
  let executor: DbExecutor;
  let mockDriver: jest.Mocked<DbDriver>;
  const config: DbConfig = {
    driver: "mysql",
    host: "localhost",
    port: 3306,
    user: "root",
    password: "password",
    database: "testdb",
    enableRunQuery: true,
    enableRunUpdateStatement: true,
    enableRunDeleteStatement: false,
    enableRunStatement: false,
  };

  beforeEach(() => {
    mockDriver = {
      name: "mysql",
      connect: jest.fn(),
      disconnect: jest.fn(),
      listTables: jest.fn(),
      describeTable: jest.fn(),
      getTableSchema: jest.fn(),
      getRelationships: jest.fn(),
      getTableStats: jest.fn(),
      sampleRows: jest.fn(),
      executeQuery: jest.fn(),
      executeUpdate: jest.fn(),
      executeDelete: jest.fn(),
      executeStatement: jest.fn(),
    } as any;

    executor = new DbExecutor(mockDriver, config);
  });

  describe("Query Safety", () => {
    it("should allow SELECT in runQuery", async () => {
      await executor.runQuery("SELECT * FROM users");
      expect(mockDriver.executeQuery).toHaveBeenCalled();
    });

    it("should block UPDATE in runQuery", async () => {
      await expect(executor.runQuery("UPDATE users SET name = 'hot'"))
        .rejects.toThrow("Only read-only queries");
    });

    it("should block DELETE in runQuery", async () => {
      await expect(executor.runQuery("DELETE FROM users"))
        .rejects.toThrow("Only read-only queries");
    });

    it("should allow INSERT in runUpdateStatement", async () => {
      await executor.runUpdateStatement("INSERT INTO users (name) VALUES ('test')");
      expect(mockDriver.executeUpdate).toHaveBeenCalled();
    });

    it("should block DELETE in runUpdateStatement", async () => {
      await expect(executor.runUpdateStatement("DELETE FROM users"))
        .rejects.toThrow("Only modification queries");
    });

    it("should throw error if runDeleteStatement is disabled", async () => {
      await expect(executor.runDeleteStatement("DELETE FROM users"))
        .rejects.toThrow("Tool 'run_delete_statement' is disabled");
    });

    it("should block DROP in runDeleteStatement", async () => {
      // Re-create executor with delete enabled to test validation
      executor = new DbExecutor(mockDriver, { ...config, enableRunDeleteStatement: true });
      await expect(executor.runDeleteStatement("DROP TABLE users"))
        .rejects.toThrow("Only removal queries");
    });
  });

  describe("Relationships", () => {
    it("should pass tables filter to driver in getRelationships", async () => {
      const tables = ["users", "orders"];
      await executor.getRelationships(tables);
      expect(mockDriver.getRelationships).toHaveBeenCalledWith(tables);
    });
  });
});
