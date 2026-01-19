export class SqlValidator {
  /**
   * Blocks keywords that are not allowed for a given operation.
   * Checks case-insensitively and avoids being fooled by keywords inside strings/comments.
   */
  static validate(query: string, blockedKeywords: string[]): void {
    if (blockedKeywords.length === 0) return;

    const queryWithoutComments = query
      .replace(/\/\*[\s\S]*?\*\/|([^:]|^)\/\/.*|--.*/g, "$1")
      .trim();
      
    const queryWithoutLiterals = queryWithoutComments
      .replace(/'(?:''|[^'])*'/g, "''")
      .replace(/"(?:""|[^"])*"/g, '""')
      .replace(/`(?:``|[^`])*`/g, "``");

    const tokens = queryWithoutLiterals.toUpperCase().split(/\s+/);
    
    for (const keyword of blockedKeywords) {
      if (tokens.includes(keyword.toUpperCase())) {
        throw new Error(`Forbidden keyword detected: ${keyword}. Statement blocked for security.`);
      }
    }
  }

  static isSelectOnly(query: string): void {
    const q = query.trim().toUpperCase();
    if (!q.startsWith("SELECT") && !q.startsWith("SHOW") && !q.startsWith("DESCRIBE") && !q.startsWith("EXPLAIN")) {
      throw new Error("Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed.");
    }
    this.validate(query, ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "REPLACE"]);
  }

  static isUpdateOnly(query: string): void {
    const q = query.trim().toUpperCase();
    if (!q.startsWith("INSERT") && !q.startsWith("UPDATE") && !q.startsWith("REPLACE")) {
       throw new Error("Only modification queries (INSERT, UPDATE, REPLACE) are allowed.");
    }
    this.validate(query, ["DELETE", "DROP", "ALTER", "TRUNCATE"]);
  }

  static isDeleteOnly(query: string): void {
    const q = query.trim().toUpperCase();
    if (!q.startsWith("DELETE") && !q.startsWith("TRUNCATE")) {
      throw new Error("Only removal queries (DELETE, TRUNCATE) are allowed.");
    }
    this.validate(query, ["DROP", "ALTER"]);
  }
}
