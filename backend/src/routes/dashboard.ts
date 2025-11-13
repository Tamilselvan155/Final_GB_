import express from 'express';
import { Database } from '../database/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Total sales
    const salesStmt = Database.prepare(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(total_amount) as total_sales,
        SUM(amount_paid) as total_collected,
        AVG(total_amount) as average_invoice_value
      FROM invoices 
      WHERE created_at >= ?
    `);
    
    const sales = salesStmt.get(startDate.toISOString());
    
    // Product statistics
    const productStmt = Database.prepare(`
      SELECT 
        COUNT(*) as total_products,
        SUM(stock_quantity) as total_stock,
        SUM(CASE WHEN stock_quantity <= min_stock_level THEN 1 ELSE 0 END) as low_stock_count
      FROM products 
      WHERE status = 'active'
    `);
    
    const products = productStmt.get();
    
    // Customer statistics
    const customerStmt = Database.prepare(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_customers
      FROM customers 
      WHERE status = 'active'
    `);
    
    const customers = customerStmt.get(startDate.toISOString());
    
    // Recent invoices
    const recentInvoicesStmt = Database.prepare(`
      SELECT i.*, c.name as customer_name
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `);
    
    const recentInvoices = recentInvoicesStmt.all();
    
    // Top selling products
    const topProductsStmt = Database.prepare(`
      SELECT 
        p.name,
        p.sku,
        SUM(ii.quantity) as total_sold,
        SUM(ii.total) as total_revenue
      FROM invoice_items ii
      JOIN products p ON ii.product_id = p.id
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.created_at >= ?
      GROUP BY p.id, p.name, p.sku
      ORDER BY total_sold DESC
      LIMIT 5
    `);
    
    const topProducts = topProductsStmt.all(startDate.toISOString());
    
    res.json({
      success: true,
      data: {
        sales,
        products,
        customers,
        recentInvoices,
        topProducts,
        period: days
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get sales chart data
router.get('/sales-chart', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    
    const stmt = Database.prepare(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as invoice_count,
        SUM(total_amount) as total_sales
      FROM invoices 
      WHERE created_at >= date('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    
    const chartData = stmt.all();
    
    res.json({
      success: true,
      data: chartData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales chart data'
    });
  }
});

// Get payment method distribution
router.get('/payment-methods', (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const stmt = Database.prepare(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM invoices 
      WHERE created_at >= ?
      GROUP BY payment_method
      ORDER BY count DESC
    `);
    
    const paymentMethods = stmt.all(startDate.toISOString());
    
    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment method data'
    });
  }
});

export default router;
