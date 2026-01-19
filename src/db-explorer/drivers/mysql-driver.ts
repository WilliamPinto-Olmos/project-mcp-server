import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { 
  DbDriver, 
  DbConfig, 
  TableInfo, 
  ColumnInfo, 
  Relationship, 
  TableStats, 
  QueryResult, 
  UpdateResult, 
  DeleteResult, 
  StatementResult 
} from "../types.js";

export class MySQLDriver implements DbDriver {
  public name = "mysql";
  private pool: Pool | null = null;
  private config: DbConfig;

  constructor(config: DbConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      connectionLimit: this.config.poolSize || 10,
      waitForConnections: true,
      queueLimit: 0
    });

    const connection = await this.pool.getConnection();
    connection.release();
    console.error(`[MySQLDriver] Connected to ${this.config.host}:${this.config.port}/${this.config.database}`);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  private getPool(): Pool {
    if (!this.pool) throw new Error("Driver not connected. Call connect() first.");
    return this.pool;
  }

  async listTables(): Promise<TableInfo[]> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      `SELECT TABLE_NAME as name, TABLE_SCHEMA as \`schema\`, TABLE_TYPE as type, TABLE_COMMENT as comment 
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ?`,
      [this.config.database]
    );

    return rows.map((r: RowDataPacket) => ({
      name: r.name,
      schema: r.schema,
      type: r.type,
      comment: r.comment || undefined
    }));
  }

  async describeTable(table: string): Promise<ColumnInfo[]> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      `SELECT 
        COLUMN_NAME as name, 
        DATA_TYPE as type, 
        COLUMN_TYPE as fullType,
        IS_NULLABLE as nullable, 
        COLUMN_DEFAULT as defaultValue, 
        COLUMN_KEY as columnKey, 
        EXTRA as extra,
        COLUMN_COMMENT as comment,
        CHARACTER_MAXIMUM_LENGTH as characterMaxLength,
        NUMERIC_PRECISION as numericPrecision,
        NUMERIC_SCALE as numericScale
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [this.config.database, table]
    );

    return rows.map((r: RowDataPacket) => {
      const isEnum = r.fullType.startsWith("enum(") || r.fullType.startsWith("set(");
      let enumValues: string[] | undefined;
      
      if (isEnum) {
        const matches = r.fullType.match(/'([^']*)'/g);
        if (matches) {
          enumValues = matches.map((m: string) => m.replace(/'/g, ""));
        }
      }

      return {
        name: r.name,
        type: r.type,
        fullType: r.fullType,
        nullable: r.nullable === "YES",
        defaultValue: r.defaultValue,
        isPrimaryKey: r.columnKey === "PRI",
        isForeignKey: r.columnKey === "MUL",
        isAutoIncrement: r.extra?.includes("auto_increment") || false,
        comment: r.comment || undefined,
        extra: r.extra || undefined,
        enumValues,
        characterMaxLength: r.characterMaxLength ? Number(r.characterMaxLength) : undefined,
        numericPrecision: r.numericPrecision ? Number(r.numericPrecision) : undefined,
        numericScale: r.numericScale ? Number(r.numericScale) : undefined
      };
    });
  }

  async getTableSchema(table: string): Promise<string> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      `SHOW CREATE TABLE \`${table}\``
    );
    return rows[0]?.["Create Table"] || "";
  }

  async getRelationships(tables?: string[]): Promise<Relationship[]> {
    let query = `SELECT 
        CONSTRAINT_NAME as constraintName, 
        TABLE_NAME as fromTable, 
        COLUMN_NAME as fromColumn, 
        REFERENCED_TABLE_NAME as toTable, 
        REFERENCED_COLUMN_NAME as toColumn
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`;
    
    const params: any[] = [this.config.database];

    if (tables && tables.length > 0) {
      const placeholders = tables.map(() => "?").join(",");
      query += ` AND (TABLE_NAME IN (${placeholders}) OR REFERENCED_TABLE_NAME IN (${placeholders}))`;
      params.push(...tables, ...tables);
    }

    const [rows] = await this.getPool().execute<RowDataPacket[]>(query, params);

    return rows.map((r: RowDataPacket) => ({
      constraintName: r.constraintName,
      fromTable: r.fromTable,
      fromColumn: r.fromColumn,
      toTable: r.toTable,
      toColumn: r.toColumn
    }));
  }

  async getTableStats(table: string): Promise<TableStats> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      `SELECT 
        TABLE_ROWS as rowCount,
        DATA_LENGTH as dataLength,
        INDEX_LENGTH as indexLength,
        CREATE_TIME as createTime,
        UPDATE_TIME as updateTime
       FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [this.config.database, table]
    );

    const r = rows[0];
    if (!r) throw new Error(`Table ${table} not found.`);

    return {
      rowCount: Number(r.rowCount),
      dataLength: Number(r.dataLength),
      indexLength: Number(r.indexLength),
      createTime: r.createTime ? new Date(r.createTime) : undefined,
      updateTime: r.updateTime ? new Date(r.updateTime) : undefined
    };
  }

  async sampleRows(table: string, limit: number = 10): Promise<any[]> {
    const safeLimit = Math.max(1, Math.floor(Number(limit) || 10));
    const [rows] = await this.getPool().execute<RowDataPacket[]>(
      `SELECT * FROM \`${table}\` LIMIT ${safeLimit}`
    );
    return rows;
  }

  async executeQuery(query: string): Promise<QueryResult> {
    const [rows] = await this.getPool().execute<RowDataPacket[]>(query);
    return { rows };
  }

  async executeUpdate(query: string): Promise<UpdateResult> {
    const [result] = await this.getPool().execute<ResultSetHeader>(query);
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
      message: result.info
    };
  }

  async executeDelete(query: string): Promise<DeleteResult> {
    const [result] = await this.getPool().execute<ResultSetHeader>(query);
    return {
      affectedRows: result.affectedRows,
      message: result.info
    };
  }

  async executeStatement(query: string): Promise<StatementResult> {
    const [result] = await this.getPool().execute(query);
    return {
      success: true,
      data: result
    };
  }
}
