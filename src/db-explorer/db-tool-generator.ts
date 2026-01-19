import { DbDriver, DbDriverPermissions } from "./types.js";
import { DbExecutor } from "./db-executor.js";

export class DbToolGenerator {
  private executor: DbExecutor;

  constructor(
    private driver: DbDriver,
    private permissions: DbDriverPermissions = {}
  ) {
    this.executor = new DbExecutor(driver, permissions);
  }

  getToolDefinitions() {
    return this.driver.getToolDefinitions(this.permissions);
  }

  async handleToolCall(name: string, args: any) {
    return await this.executor.handleToolCall(name, args);
  }
}
