import DatabaseLib from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: DatabaseLib.Database | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public initialize(): void {
    const dbPath = process.env.DATABASE_PATH || './database/gold_billing.db';
    const dbDir = path.dirname(dbPath);

    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new DatabaseLib(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    console.log(`📦 Database connected: ${dbPath}`);
  }

  public getDatabase(): DatabaseLib.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('📦 Database connection closed');
    }
  }

  public runMigration(sql: string): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    this.db.exec(sql);
  }

  public prepare(sql: string): DatabaseLib.Statement {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql);
  }
}

// Export singleton instance
export const Database = DatabaseConnection.getInstance();
