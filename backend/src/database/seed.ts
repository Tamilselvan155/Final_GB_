import { Database } from './connection.js';

const seedDatabase = () => {
  try {
    console.log('🌱 Seeding database with initial data...');
    
    // Initialize database
    Database.initialize();
    
    // Insert sample products
    const insertProduct = Database.prepare(`
      INSERT INTO products (name, category, sku, barcode, weight, purity, making_charge, current_rate, stock_quantity, min_stock_level, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const products = [
      ['Gold Chain 22K', 'Chains', 'GC001', '1234567890123', 15.5, '22K', 500, 5500, 5, 2, 'Beautiful 22K gold chain'],
      ['Gold Ring 18K', 'Rings', 'GR001', '1234567890124', 8.2, '18K', 300, 4800, 3, 1, 'Elegant 18K gold ring'],
      ['Gold Earrings 22K', 'Earrings', 'GE001', '1234567890125', 12.0, '22K', 400, 5500, 4, 2, 'Traditional 22K gold earrings'],
      ['Gold Bracelet 18K', 'Bracelets', 'GB001', '1234567890126', 20.0, '18K', 600, 4800, 2, 1, 'Stylish 18K gold bracelet'],
      ['Gold Pendant 22K', 'Pendants', 'GP001', '1234567890127', 6.5, '22K', 250, 5500, 8, 3, 'Intricate 22K gold pendant']
    ];
    
    products.forEach(product => {
      insertProduct.run(...product);
    });
    
    // Insert sample customers
    const insertCustomer = Database.prepare(`
      INSERT INTO customers (name, phone, email, address, city, state, pincode, customer_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const customers = [
      ['Rajesh Kumar', '+91 9876543210', 'rajesh@example.com', '123 Main Street', 'Chennai', 'Tamil Nadu', '600001', 'individual'],
      ['Priya Sharma', '+91 9876543211', 'priya@example.com', '456 Park Avenue', 'Mumbai', 'Maharashtra', '400001', 'individual'],
      ['Gold Palace Jewellers', '+91 9876543212', 'info@goldpalace.com', '789 Business District', 'Delhi', 'Delhi', '110001', 'business'],
      ['Anita Singh', '+91 9876543213', 'anita@example.com', '321 Garden Street', 'Bangalore', 'Karnataka', '560001', 'individual']
    ];
    
    customers.forEach(customer => {
      insertCustomer.run(...customer);
    });
    
    // Insert sample gold rates
    const insertGoldRate = Database.prepare(`
      INSERT INTO gold_rates (purity, rate, date)
      VALUES (?, ?, ?)
    `);
    
    const today = new Date().toISOString().split('T')[0];
    const goldRates = [
      ['22K', 5500, today],
      ['18K', 4800, today],
      ['14K', 3800, today],
      ['24K', 6000, today]
    ];
    
    goldRates.forEach(rate => {
      insertGoldRate.run(...rate);
    });
    
    // Insert sample settings
    const insertSetting = Database.prepare(`
      INSERT INTO settings (key, value, description)
      VALUES (?, ?, ?)
    `);
    
    const settings = [
      ['company_name', 'Gold Billing System', 'Company name for invoices'],
      ['company_address', '123 Business Street, City, State - 123456', 'Company address for invoices'],
      ['company_phone', '+91 9876543210', 'Company phone number'],
      ['company_email', 'info@goldbilling.com', 'Company email address'],
      ['gst_number', '29ABCDE1234F1Z5', 'GST registration number'],
      ['default_tax_rate', '3', 'Default tax rate percentage'],
      ['currency_symbol', '₹', 'Currency symbol for display'],
      ['invoice_prefix', 'INV', 'Prefix for invoice numbers'],
      ['low_stock_threshold', '5', 'Threshold for low stock alerts']
    ];
    
    settings.forEach(setting => {
      insertSetting.run(...setting);
    });
    
    console.log('✅ Database seeded successfully');
    
    // Close database connection
    Database.close();
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
seedDatabase();

export { seedDatabase };
