export interface DbDriver {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  listTables(): Promise<TableInfo[]>;
  describeTable(table: string): Promise<ColumnInfo[]>;
  getTableSchema(table: string): Promise<string>;
  getRelationships(tables?: string[]): Promise<Relationship[]>;
  getTableStats(table: string): Promise<TableStats>;
  
  sampleRows(table: string, limit?: number): Promise<any[]>;
  
  executeQuery(query: string): Promise<QueryResult>;
  executeUpdate(query: string): Promise<UpdateResult>;
  executeDelete(query: string): Promise<DeleteResult>;
  executeStatement(query: string): Promise<StatementResult>;
}

export interface DbConfig {
  driver: 'mysql';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  poolSize?: number;
  enableRunQuery?: boolean;
  enableRunUpdateStatement?: boolean;
  enableRunDeleteStatement?: boolean;
  enableRunStatement?: boolean;
}

export interface TableInfo {
  name: string;
  schema: string;
  type: 'BASE TABLE' | 'VIEW';
  comment?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  fullType: string;
  nullable: boolean;
  defaultValue?: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isAutoIncrement: boolean;
  comment?: string;
  extra?: string;
  enumValues?: string[];
  characterMaxLength?: number;
  numericPrecision?: number;
  numericScale?: number;
}

export interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName: string;
}

export interface TableStats {
  rowCount: number;
  dataLength?: number;
  indexLength?: number;
  createTime?: Date;
  updateTime?: Date;
}

export interface QueryResult {
  rows: any[];
  fields?: any[];
}

export interface UpdateResult {
  affectedRows: number;
  insertId?: number | string;
  message?: string;
}

export interface DeleteResult {
  affectedRows: number;
  message?: string;
}

export interface StatementResult {
  success: boolean;
  message?: string;
  data?: any;
}
