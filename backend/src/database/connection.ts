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
    
    // Run auto-migrations
    this.runAutoMigrations();
    
    console.log(`📦 Database connected: ${dbPath}`);
  }

  private runAutoMigrations(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Check if material_type column exists
      const tableInfo = this.db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string; type: string }>;
      const hasMaterialType = tableInfo.some(col => col.name === 'material_type');

      if (!hasMaterialType) {
        console.log('🔄 Adding material_type column to products table...');
        this.db.exec('ALTER TABLE products ADD COLUMN material_type TEXT');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_products_material_type ON products(material_type)');
        this.db.exec("UPDATE products SET material_type = 'Gold' WHERE material_type IS NULL");
        console.log('✅ material_type column added successfully');
      }
    } catch (error: any) {
      // Ignore if column already exists or other non-critical errors
      if (!error.message?.includes('duplicate column')) {
        console.warn('⚠️  Migration warning:', error.message);
      }
    }
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
