import { z } from "zod";
import { DbExecutor } from "./db-executor.js";

export class DbToolGenerator {
  constructor(private executor: DbExecutor) {}

  getToolDefinitions() {
    return {
      list_tables: {
        description: "List all tables in the current database.",
      },
      describe_table: {
        description: "Get detailed information about columns in a specific table.",
        inputSchema: z.object({
          table: z.string().describe("The name of the table to describe."),
        }),
      },
      describe_tables: {
        description: "Get detailed information about columns for multiple tables.",
        inputSchema: z.object({
          tables: z.array(z.string()).describe("List of table names to describe."),
        }),
      },
      get_schema: {
        description: "Get the DDL (CREATE TABLE) statement for a specific table.",
        inputSchema: z.object({
          table: z.string().describe("The name of the table."),
        }),
      },
      get_schemas: {
        description: "Get the DDL statements for multiple tables.",
        inputSchema: z.object({
          tables: z.array(z.string()).describe("List of table names."),
        }),
      },
      get_relationships: {
        description: "Get all foreign key relationships in the database.",
      },
      get_table_stats: {
        description: "Get row count and other statistics for a table.",
        inputSchema: z.object({
          table: z.string().describe("The name of the table."),
        }),
      },
      sample_rows: {
        description: "Fetch sample rows from a table.",
        inputSchema: z.object({
          table: z.string().describe("The name of the table."),
          limit: z.number().optional().default(10).describe("Maximum number of rows to fetch."),
        }),
      },
      run_query: {
        description: "Execute a read-only SELECT query. Blocks modification keywords.",
        inputSchema: z.object({
          query: z.string().describe("The SQL SELECT query to execute."),
        }),
      },
      run_update_statement: {
        description: "Execute an INSERT or UPDATE statement. Blocks DELETE and other dangerous keywords.",
        inputSchema: z.object({
          query: z.string().describe("The SQL INSERT/UPDATE statement."),
        }),
      },
      run_delete_statement: {
        description: "Execute a DELETE or TRUNCATE statement. Blocks DROP/ALTER.",
        inputSchema: z.object({
          query: z.string().describe("The SQL DELETE/TRUNCATE statement."),
        }),
      },
      run_statement: {
        description: "Execute any SQL statement. Full access, use with extreme caution. Disabled by default.",
        inputSchema: z.object({
          query: z.string().describe("The SQL statement to execute."),
        }),
      },
    };
  }

  async handleToolCall(name: string, args: any) {
    switch (name) {
      case "list_tables":
        return await this.executor.listTables();
      case "describe_table":
        return await this.executor.describeTable(args.table);
      case "describe_tables":
        return await this.executor.describeTables(args.tables);
      case "get_schema":
        return await this.executor.getTableSchema(args.table);
      case "get_schemas":
        return await this.executor.getTableSchemas(args.tables);
      case "get_relationships":
        return await this.executor.getRelationships();
      case "get_table_stats":
        return await this.executor.getTableStats(args.table);
      case "sample_rows":
        return await this.executor.sampleRows(args.table, args.limit);
      case "run_query":
        return await this.executor.runQuery(args.query);
      case "run_update_statement":
        return await this.executor.runUpdateStatement(args.query);
      case "run_delete_statement":
        return await this.executor.runDeleteStatement(args.query);
      case "run_statement":
        return await this.executor.runStatement(args.query);
      default:
        throw new Error(`Unknown database tool: ${name}`);
    }
  }
}
