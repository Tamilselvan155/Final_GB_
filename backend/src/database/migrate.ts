import fs from 'fs';
import path from 'path';
import { Database } from './connection.js';

const runMigrations = () => {
  try {
    console.log('🔄 Running database migrations...');
    
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
    console.log('Schema path:', schemaPath);
    console.log('Schema file exists:', fs.existsSync(schemaPath));
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Schema length:', schema.length);
    
    // Initialize database
    Database.initialize();
    
    // Run schema
    Database.runMigration(schema);
    
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
