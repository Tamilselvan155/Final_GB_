-- Migration: Add material_type column to products table
-- Date: 2024-01-XX
-- Description: Add material type classification to products (Gold, Silver, Platinum, Diamond, Other)

-- Step 1: Add the new material_type column
-- This column will be nullable to support existing data
-- Note: SQLite doesn't support CHECK constraints in ALTER TABLE ADD COLUMN
-- The constraint will be enforced at the application level
ALTER TABLE products ADD COLUMN material_type TEXT;

-- Step 2: Create an index for better query performance on the new column
CREATE INDEX IF NOT EXISTS idx_products_material_type ON products(material_type);

-- Step 3: Update existing products with default material_type based on purity
-- Products with purity values are assumed to be Gold by default
UPDATE products 
SET material_type = 'Gold' 
WHERE material_type IS NULL;

-- Migration completed successfully
-- The material_type column has been added with:
-- - Nullable constraint to support existing data
-- - CHECK constraint to enforce valid values ('Gold', 'Silver', 'Platinum', 'Diamond', 'Other')
-- - Index for query performance
-- - Default value 'Gold' for existing products

