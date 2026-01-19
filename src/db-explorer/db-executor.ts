import { DbDriver, DbConfig } from "./types.js";
import { SqlValidator } from "./sql-validator.js";

export class DbExecutor {
  private driver: DbDriver;
  private config: DbConfig;

  constructor(driver: DbDriver, config: DbConfig) {
    this.driver = driver;
    this.config = config;
  }

  getDriver(): DbDriver {
    return this.driver;
  }

  async connect(): Promise<void> {
    await this.driver.connect();
  }

  async disconnect(): Promise<void> {
    await this.driver.disconnect();
  }

  async listTables() {
    return await this.driver.listTables();
  }

  async describeTable(table: string) {
    return await this.driver.describeTable(table);
  }

  async describeTables(tables: string[]) {
    const results: Record<string, any> = {};
    for (const table of tables) {
      results[table] = await this.driver.describeTable(table);
    }
    return results;
  }

  async getTableSchema(table: string) {
    return await this.driver.getTableSchema(table);
  }

  async getTableSchemas(tables: string[]) {
    const results: Record<string, string> = {};
    for (const table of tables) {
      results[table] = await this.driver.getTableSchema(table);
    }
    return results;
  }

  async getRelationships() {
    return await this.driver.getRelationships();
  }

  async getTableStats(table: string) {
    return await this.driver.getTableStats(table);
  }

  async sampleRows(table: string, limit?: number) {
    return await this.driver.sampleRows(table, limit);
  }

  async runQuery(query: string) {
    if (this.config.enableRunQuery === false) {
      throw new Error("Tool 'run_query' is disabled.");
    }
    SqlValidator.isSelectOnly(query);
    return await this.driver.executeQuery(query);
  }

  async runUpdateStatement(query: string) {
    if (this.config.enableRunUpdateStatement === false) {
      throw new Error("Tool 'run_update_statement' is disabled.");
    }
    SqlValidator.isUpdateOnly(query);
    return await this.driver.executeUpdate(query);
  }

  async runDeleteStatement(query: string) {
    if (this.config.enableRunDeleteStatement !== true) {
      throw new Error("Tool 'run_delete_statement' is disabled.");
    }
    SqlValidator.isDeleteOnly(query);
    return await this.driver.executeDelete(query);
  }

  async runStatement(query: string) {
    if (this.config.enableRunStatement !== true) {
      throw new Error("Tool 'run_statement' is disabled.");
    }
    return await this.driver.executeStatement(query);
  }
}
