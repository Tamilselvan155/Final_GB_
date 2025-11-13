import type { Request, Response } from 'express';
import { Database } from '../database/connection.js';

// Get all settings
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const db = Database.getDatabase();
    const stmt = db.prepare('SELECT key, value, description FROM settings');
    const settings = stmt.all() as Array<{ key: string; value: string; description: string | null }>;
    
    // Convert array of objects to object with key-value pairs
    const settingsObject: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });
    
    res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

// Get a specific setting by key
export const getSetting = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const db = Database.getDatabase();
    const stmt = db.prepare('SELECT key, value, description FROM settings WHERE key = ?');
    const setting = stmt.get(key) as { key: string; value: string; description: string | null } | undefined;
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        [setting.key]: setting.value
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting'
    });
  }
};

// Update settings (bulk update)
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings data'
      });
    }
    
    const db = Database.getDatabase();
    
    const updateStmt = db.prepare(`
      UPDATE settings 
      SET value = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE key = ?
    `);
    
    const insertStmt = db.prepare(`
      INSERT INTO settings (key, value, description, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    const getStmt = db.prepare('SELECT key FROM settings WHERE key = ?');
    
    const transaction = db.transaction(() => {
      const updatedKeys: string[] = [];
      
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value !== 'string') {
          continue; // Skip non-string values
        }
        
        const existing = getStmt.get(key);
        
        if (existing) {
          updateStmt.run(value, key);
        } else {
          // Insert new setting with a default description
          const description = getDefaultDescription(key);
          insertStmt.run(key, value, description);
        }
        
        updatedKeys.push(key);
      }
      
      return updatedKeys;
    });
    
    const updatedKeys = transaction();
    
    res.json({
      success: true,
      message: `Updated ${updatedKeys.length} setting(s)`,
      data: {
        updated: updatedKeys
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

// Helper function to get default description for a setting key
function getDefaultDescription(key: string): string {
  const descriptions: Record<string, string> = {
    company_name: 'Company name for invoices and bills',
    company_address: 'Company address for invoices and bills',
    company_phone: 'Company phone number',
    company_email: 'Company email address',
    gst_number: 'GST registration number',
    bis_license: 'BIS license number',
    default_tax_rate: 'Default tax rate percentage',
    currency_symbol: 'Currency symbol for display',
    invoice_prefix: 'Prefix for invoice numbers',
    low_stock_threshold: 'Threshold for low stock alerts'
  };
  
  return descriptions[key] || `Setting for ${key}`;
}

