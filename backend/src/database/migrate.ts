import fs from 'fs';
import path from 'path';
import { Database } from './connection.js';

const runMigrations = () => {
  try {
    console.log('🔄 Running database migrations...');
    
    // Initialize database
    Database.initialize();
    
    // Read main schema file
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('Running main schema...');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      Database.runMigration(schema);
    }
    
    // Read users schema file
    const usersSchemaPath = path.join(process.cwd(), 'database', 'users_schema.sql');
    if (fs.existsSync(usersSchemaPath)) {
      console.log('Running users schema...');
      const usersSchema = fs.readFileSync(usersSchemaPath, 'utf8');
      Database.runMigration(usersSchema);
    }
    
    // Read material_type migration file (for existing databases)
    const materialTypeMigrationPath = path.join(process.cwd(), 'database', 'migrate_add_material_type.sql');
    if (fs.existsSync(materialTypeMigrationPath)) {
      try {
        console.log('Running material_type migration...');
        const materialTypeMigration = fs.readFileSync(materialTypeMigrationPath, 'utf8');
        Database.runMigration(materialTypeMigration);
      } catch (error: any) {
        // Ignore errors if column already exists (for new databases)
        if (!error.message?.includes('duplicate column')) {
          console.log('Material type migration skipped (column may already exist)');
        }
      }
    }
    
    console.log('✅ Database migrations completed successfully');
    
    // Close database connection
    Database.close();
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migrations if this file is executed directly
runMigrations();

export { runMigrations };
