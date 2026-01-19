import { jest } from "@jest/globals";
import mysql from "mysql2/promise";
import { MySQLDriver } from "../../src/db-explorer/drivers/mysql-driver.js";

describe("MySQLDriver", () => {
  let driver: MySQLDriver;
  let mockPool: any;
  const config = {
    driver: "mysql" as const,
    host: "localhost",
    port: 3306,
    user: "root",
    password: "password",
    database: "testdb",
  };

  beforeEach(() => {
    mockPool = {
      getConnection: jest.fn(async () => ({ release: jest.fn() })),
      execute: jest.fn(),
      end: jest.fn(),
    };
    
    // In ESM, defaults are often on the .default property if not using proper interop
    // But mysql2/promise usually works with direct spyOn if imported correctly
    jest.spyOn(mysql, 'createPool').mockReturnValue(mockPool as any);
    
    driver = new MySQLDriver(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should connect and create a pool", async () => {
    await driver.connect();
    expect(mysql.createPool).toHaveBeenCalledWith(expect.objectContaining({
      host: "localhost",
      database: "testdb",
    }));
  });

  it("should list tables correctly", async () => {
    mockPool.execute.mockResolvedValueOnce([
      [
        { name: "users", schema: "testdb", type: "BASE TABLE", comment: "User table" },
        { name: "orders", schema: "testdb", type: "BASE TABLE", comment: "" },
      ],
    ]);

    await driver.connect();
    const tables = await driver.listTables();

    expect(tables).toHaveLength(2);
    expect(tables[0].name).toBe("users");
    expect(tables[1].comment).toBeUndefined();
  });

  it("should describe table with enum values correctly", async () => {
    mockPool.execute.mockResolvedValueOnce([
      [
        {
          name: "status",
          type: "enum",
          fullType: "enum('active','inactive')",
          nullable: "NO",
          columnKey: "",
          extra: "",
          comment: "",
        },
      ],
    ]);

    await driver.connect();
    const columns = await driver.describeTable("users");

    expect(columns).toHaveLength(1);
    expect(columns[0].enumValues).toEqual(["active", "inactive"]);
  });

  it("should get relationships correctly", async () => {
    mockPool.execute.mockResolvedValueOnce([
      [
        {
          constraintName: "fk_user",
          fromTable: "orders",
          fromColumn: "user_id",
          toTable: "users",
          toColumn: "id",
        },
      ],
    ]);

    await driver.connect();
    const relationships = await driver.getRelationships();

    expect(relationships).toHaveLength(1);
    expect(relationships[0].fromTable).toBe("orders");
    expect(relationships[0].toTable).toBe("users");
  });

  it("should filter relationships by table names", async () => {
    mockPool.execute.mockResolvedValueOnce([
      [
        {
          constraintName: "fk_user",
          fromTable: "orders",
          fromColumn: "user_id",
          toTable: "users",
          toColumn: "id",
        },
      ],
    ]);

    await driver.connect();
    const relationships = await driver.getRelationships(["orders"]);

    expect(mockPool.execute).toHaveBeenCalledWith(
      expect.stringContaining("AND (TABLE_NAME IN (?) OR REFERENCED_TABLE_NAME IN (?))"),
      ["testdb", "orders", "orders"]
    );
    expect(relationships).toHaveLength(1);
  });
});
