import express from 'express';
import { Database } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All invoice routes require authentication
router.use(authenticate);

// Get all invoices
router.get('/', (req, res) => {
  try {
    const { customer_id, payment_status, start_date, end_date, search } = req.query;
    
    let query = `
      SELECT i.*, c.name as customer_name, c.phone as customer_phone
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (customer_id) {
      query += ' AND i.customer_id = ?';
      params.push(customer_id);
    }
    
    if (payment_status) {
      query += ' AND i.payment_status = ?';
      params.push(payment_status);
    }
    
    if (start_date) {
      query += ' AND DATE(i.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(i.created_at) <= ?';
      params.push(end_date);
    }
    
    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR i.customer_name LIKE ? OR i.customer_phone LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const stmt = Database.prepare(query);
    const invoices = stmt.all(...params);
    
    res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoices'
    });
  }
});

// Get invoice by ID with items
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // Convert ID to integer for database query (SQLite stores IDs as INTEGER)
    const invoiceId = parseInt(id, 10);
    
    if (isNaN(invoiceId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid invoice ID'
      });
    }
    
    // Get invoice details
    const invoiceStmt = Database.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `);
    const invoice = invoiceStmt.get(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    // Get invoice items - ensure we use integer ID
    const itemsStmt = Database.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?');
    const items = itemsStmt.all(invoiceId);
    
    console.log(`Fetched invoice ${invoiceId}: Found ${items.length} items`);
    
    res.json({
      success: true,
      data: {
        ...invoice,
        items: items || []
      }
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice'
    });
  }
});

// Create new invoice
router.post('/', (req, res) => {
  try {
    const {
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      items,
      subtotal,
      tax_percentage = 0,
      tax_amount = 0,
      discount_percentage = 0,
      discount_amount = 0,
      total_amount,
      payment_method,
      notes,
      created_at,
      updated_at,
    } = req.body;
    
    console.log('Invoice creation request:', {
      customer_name,
      customer_phone,
      subtotal,
      total_amount,
      payment_method,
      itemsCount: Array.isArray(items) ? items.length : 0
    });
    
    // Validate required fields (items are optional to support imports without line items)
    if (!customer_name || !total_amount || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Normalize created_at / updated_at so imports can preserve original dates
    const nowIso = new Date().toISOString();
    const createdAtIso = created_at && !isNaN(Date.parse(created_at))
      ? new Date(created_at).toISOString()
      : nowIso;
    const updatedAtIso = updated_at && !isNaN(Date.parse(updated_at))
      ? new Date(updated_at).toISOString()
      : createdAtIso;
    
    const transaction = Database.getDatabase().transaction(() => {
      // Insert invoice (explicitly setting created_at / updated_at to allow historical imports)
      const invoiceStmt = Database.prepare(`
        INSERT INTO invoices (
          invoice_number, customer_id, customer_name, customer_phone, customer_address, 
          subtotal, tax_percentage, tax_amount, discount_percentage, discount_amount, 
          total_amount, payment_method, notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const invoiceResult = invoiceStmt.run(
        invoiceNumber,
        customer_id || null,
        customer_name,
        customer_phone,
        customer_address,
        subtotal,
        tax_percentage,
        tax_amount,
        discount_percentage,
        discount_amount,
        total_amount,
        payment_method,
        notes,
        createdAtIso,
        updatedAtIso
      );
      
      const invoiceId = invoiceResult.lastInsertRowid;
      
      // Insert invoice items - ensure items array exists and has items
      if (!items || !Array.isArray(items) || items.length === 0) {
        console.warn('Warning: Invoice created without items!', {
          invoiceId,
          itemsCount: items?.length || 0
        });
      } else {
        console.log(`Inserting ${items.length} items for invoice ${invoiceId}`);
        const itemStmt = Database.prepare(`
          INSERT INTO invoice_items (invoice_id, product_id, product_name, weight, rate, making_charge, quantity, total)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        items.forEach((item: any, index: number) => {
          if (!item.product_name) {
            console.warn(`Skipping item ${index} without product_name:`, item);
            return;
          }
          
          try {
            itemStmt.run(
              invoiceId, 
              item.product_id || null, 
              item.product_name || 'Unknown Product', 
              item.weight || 0, 
              item.rate || 0,
              item.making_charge || 0, 
              item.quantity || 1, 
              item.total || 0
            );
            console.log(`Inserted invoice item ${index + 1}:`, {
              invoiceId,
              product_name: item.product_name,
              quantity: item.quantity,
              total: item.total
            });
            
            // Update product stock if product_id exists
            if (item.product_id) {
              const updateStockStmt = Database.prepare(`
                UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?
              `);
              updateStockStmt.run(item.quantity || 1, item.product_id);
              
              // Record stock transaction
              const stockTransactionStmt = Database.prepare(`
                INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, reason, reference_id, reference_type)
                VALUES (?, 'out', ?, ?, ?, 'Sale', ?, 'invoice')
              `);
              
              const productStmt = Database.prepare('SELECT stock_quantity FROM products WHERE id = ?');
              const product = productStmt.get(item.product_id);
              if (product) {
                const newStock = product.stock_quantity;
                stockTransactionStmt.run(
                  item.product_id, item.quantity || 1, newStock + (item.quantity || 1), newStock, invoiceId
                );
              }
            }
          } catch (itemError) {
            console.error(`Error inserting item ${index + 1}:`, itemError);
            console.error('Item data:', item);
          }
        });
      }
      
      return invoiceId;
    });
    
    const invoiceId = transaction();
    
    // Get the created invoice with items
    const getInvoice = Database.prepare(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.address as customer_address
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `);
    const invoice = getInvoice.get(invoiceId);
    
    const getItems = Database.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?');
    const invoiceItems = getItems.all(invoiceId);
    
    console.log(`Created invoice ${invoiceId} with ${invoiceItems.length} items`);
    if (invoiceItems.length === 0 && items && items.length > 0) {
      console.error('ERROR: Items were provided but not saved to database!', {
        invoiceId,
        providedItemsCount: items.length
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        ...invoice,
        items: invoiceItems || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create invoice'
    });
  }
});

// Update invoice payment status
router.patch('/:id/payment', (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, amount_paid } = req.body;
    
    const stmt = Database.prepare(`
      UPDATE invoices 
      SET payment_status = ?, amount_paid = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    
    const result = stmt.run(payment_status, amount_paid, id);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

// Delete invoice
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = Database.getDatabase().transaction(() => {
      // Delete invoice items first
      const deleteItemsStmt = Database.prepare('DELETE FROM invoice_items WHERE invoice_id = ?');
      deleteItemsStmt.run(id);
      
      // Delete invoice
      const deleteInvoiceStmt = Database.prepare('DELETE FROM invoices WHERE id = ?');
      const result = deleteInvoiceStmt.run(id);
      
      return result.changes;
    });
    
    const changes = transaction();
    
    if (changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete invoice'
    });
  }
});

export default router;
