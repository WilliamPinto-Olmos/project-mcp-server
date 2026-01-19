import { z } from "zod";
import { DbExecutor } from "./db-executor.js";

export class DbToolGenerator {
  constructor(private executor: DbExecutor) {}

  getToolDefinitions() {
    return {
      db_list_tables: {
        description: "List all tables in the current database.",
      },
      db_describe_tables: {
        description: "Get detailed information about columns for multiple tables.",
        inputSchema: z.object({
          tables: z.array(z.string()).describe("List of table names to describe."),
        }),
      },
      db_get_schemas: {
        description: "Get the DDL statements for multiple tables.",
        inputSchema: z.object({
          tables: z.array(z.string()).describe("List of table names."),
        }),
      },
      db_get_relationships: {
        description: "Get foreign key relationships in the database, optionally filtered by tables.",
        inputSchema: z.object({
          tables: z.array(z.string()).optional().describe("Optional list of table names to filter relationships by."),
        }),
      },
      db_get_table_stats: {
        description: "Get row count and other statistics for a table.",
        inputSchema: z.object({
          table: z.string().describe("The name of the table."),
        }),
      },
      db_sample_rows: {
        description: "Fetch sample rows from a table.",
        inputSchema: z.object({
          table: z.string().describe("The name of the table."),
          limit: z.number().optional().default(10).describe("Maximum number of rows to fetch."),
        }),
      },
      db_run_query: {
        description: "Execute a read-only SELECT query. Blocks modification keywords.",
        inputSchema: z.object({
          query: z.string().describe("The SQL SELECT query to execute."),
        }),
      },
      db_run_update_statement: {
        description: "Execute an INSERT or UPDATE statement. Blocks DELETE and other dangerous keywords.",
        inputSchema: z.object({
          query: z.string().describe("The SQL INSERT/UPDATE statement."),
        }),
      },
      db_run_delete_statement: {
        description: "Execute a DELETE or TRUNCATE statement. Blocks DROP/ALTER.",
        inputSchema: z.object({
          query: z.string().describe("The SQL DELETE/TRUNCATE statement."),
        }),
      },
      db_run_statement: {
        description: "Execute any SQL statement. Full access, use with extreme caution. Disabled by default.",
        inputSchema: z.object({
          query: z.string().describe("The SQL statement to execute."),
        }),
      },
    };
  }

  async handleToolCall(name: string, args: any) {
    switch (name) {
      case "db_list_tables":
        return await this.executor.listTables();
      case "db_describe_tables":
        return await this.executor.describeTables(args.tables);
      case "db_get_schemas":
        return await this.executor.getTableSchemas(args.tables);
      case "db_get_relationships":
        return await this.executor.getRelationships(args.tables);
      case "db_get_table_stats":
        return await this.executor.getTableStats(args.table);
      case "db_sample_rows":
        return await this.executor.sampleRows(args.table, args.limit);
      case "db_run_query":
        return await this.executor.runQuery(args.query);
      case "db_run_update_statement":
        return await this.executor.runUpdateStatement(args.query);
      case "db_run_delete_statement":
        return await this.executor.runDeleteStatement(args.query);
      case "db_run_statement":
        return await this.executor.runStatement(args.query);
      default:
        throw new Error(`Unknown database tool: ${name}`);
    }
  }
}
