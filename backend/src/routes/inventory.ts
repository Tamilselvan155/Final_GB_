import express from 'express';
import { Database } from '../database/connection.js';

const router = express.Router();

// Get inventory overview
router.get('/overview', (req, res) => {
  try {
    const stmt = Database.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock,
        SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count,
        SUM(stock_quantity * current_rate) as total_value
      FROM products 
      WHERE status = 'active'
    `);
    
    const overview = stmt.get();
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory overview'
    });
  }
});

// Get low stock products
router.get('/low-stock', (req, res) => {
  try {
    const stmt = Database.prepare(`
      SELECT * FROM products 
      WHERE status = 'active' AND stock_quantity <= min_stock_level
      ORDER BY stock_quantity ASC
    `);
    
    const products = stmt.all();
    
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock products'
    });
  }
});

// Get stock transactions
router.get('/transactions', (req, res) => {
  try {
    const { product_id, transaction_type, start_date, end_date } = req.query;
    
    let query = `
      SELECT st.*, p.name as product_name, p.sku
      FROM stock_transactions st
      LEFT JOIN products p ON st.product_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (product_id) {
      query += ' AND st.product_id = ?';
      params.push(product_id);
    }
    
    if (transaction_type) {
      query += ' AND st.transaction_type = ?';
      params.push(transaction_type);
    }
    
    if (start_date) {
      query += ' AND DATE(st.created_at) >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND DATE(st.created_at) <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY st.created_at DESC';
    
    const stmt = Database.prepare(query);
    const transactions = stmt.all(...params);
    
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock transactions'
    });
  }
});

// Adjust stock
router.post('/adjust', (req, res) => {
  try {
    const { product_id, quantity, reason } = req.body;
    
    if (!product_id || quantity === undefined || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Product ID, quantity, and reason are required'
      });
    }
    
    const transaction = Database.getDatabase().transaction(() => {
      // Get current stock
      const getProduct = Database.prepare('SELECT stock_quantity FROM products WHERE id = ?');
      const product = getProduct.get(product_id);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      const currentStock = product.stock_quantity;
      const newStock = currentStock + quantity;
      
      if (newStock < 0) {
        throw new Error('Insufficient stock for adjustment');
      }
      
      // Update product stock
      const updateStock = Database.prepare('UPDATE products SET stock_quantity = ? WHERE id = ?');
      updateStock.run(newStock, product_id);
      
      // Record transaction
      const recordTransaction = Database.prepare(`
        INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_stock, new_stock, reason)
        VALUES (?, 'adjustment', ?, ?, ?, ?)
      `);
      
      recordTransaction.run(product_id, quantity, currentStock, newStock, reason);
      
      return { currentStock, newStock };
    });
    
    const result = transaction();
    
    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to adjust stock'
    });
  }
});

export default router;
