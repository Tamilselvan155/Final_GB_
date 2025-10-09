-- Migration to allow product deletion with cascade
-- This updates the existing tables to allow NULL values for product_id

-- Update bill_items table to allow NULL product_id
ALTER TABLE bill_items RENAME TO bill_items_old;

CREATE TABLE bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    weight REAL NOT NULL,
    rate REAL NOT NULL,
    making_charge REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Copy data from old table
INSERT INTO bill_items SELECT * FROM bill_items_old;

-- Drop old table
DROP TABLE bill_items_old;

-- Update invoice_items table to allow NULL product_id
ALTER TABLE invoice_items RENAME TO invoice_items_old;

CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    weight REAL NOT NULL,
    rate REAL NOT NULL,
    making_charge REAL DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    total REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Copy data from old table
INSERT INTO invoice_items SELECT * FROM invoice_items_old;

-- Drop old table
DROP TABLE invoice_items_old;
