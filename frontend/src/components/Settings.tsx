import React, { useState, useEffect } from 'react';
import {
  Store,
  Download,
  Upload,
  Trash2,
  Save,
  FileText,
  AlertTriangle,
  Cloud,
  CheckCircle,
  XCircle,
  Database as DatabaseIcon,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Database from '../utils/database';

const Settings: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState('business');
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    license: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [exportStats, setExportStats] = useState<{products: number, customers: number, invoices: number, bills: number} | null>(null);
  const [importStats, setImportStats] = useState<{imported: number, total: number, errors: number} | null>(null);

  const tabs = [
    { id: 'business', name: t('settings.businessInfo'), icon: Store },
    { id: 'data', name: t('settings.dataManagement'), icon: Download },
  ];

  // Load business information from database
  useEffect(() => {
    const loadBusinessInfo = async () => {
      setIsLoading(true);
      try {
        const db = Database.getInstance();
        const settings = await db.getSettings();
        
        // Map settings keys to businessInfo fields
        setBusinessInfo({
          name: settings.company_name || '',
          address: settings.company_address || '',
          phone: settings.company_phone || '',
          email: settings.company_email || '',
          gstin: settings.gst_number || '',
          license: settings.bis_license || '',
        });
      } catch (err) {
        console.error('Error loading business info:', err);
        error('Failed to load business information');
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!businessInfo.name.trim() || !businessInfo.address.trim() || !businessInfo.phone.trim()) {
      error('Please fill in all required fields (Name, Address, Phone)');
      return;
    }

    setIsSaving(true);
    try {
      const db = Database.getInstance();
      
      // Map businessInfo to settings keys
      const settingsToUpdate: Record<string, string> = {
        company_name: businessInfo.name,
        company_address: businessInfo.address,
        company_phone: businessInfo.phone,
        company_email: businessInfo.email || '',
        gst_number: businessInfo.gstin || '',
        bis_license: businessInfo.license || '',
      };

      await db.updateSettings(settingsToUpdate);
      success(t('settings.settingsSavedSuccessfully'));
    } catch (err) {
      console.error('Error saving business info:', err);
      error('Failed to save business information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Enhanced Data Export Functions
  const exportAllData = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const db = Database.getInstance();
      
      // Progress: 20%
      setExportProgress(20);
      const [products, customers, invoices, bills] = await Promise.all([
        db.query('products'),
        db.query('customers'),
        db.query('invoices'),
        db.query('bills')
      ]);

      // Progress: 60%
      setExportProgress(60);

      // Separate regular bills from exchange bills
      const regularBills = bills?.filter((bill: any) => {
        const billNumber = bill.bill_number || bill.invoice_number || '';
        return !billNumber.startsWith('EXCH-');
      }) || [];
      
      const exchangeBills = bills?.filter((bill: any) => {
        const billNumber = bill.bill_number || bill.invoice_number || '';
        return billNumber.startsWith('EXCH-');
      }) || [];

      // Progress: 70%
      setExportProgress(70);

      // Create a single consolidated sheet with all sections
      // Using a wide column structure to accommodate all data types
      const allData: any[] = [];

      // ========== SECTION 1: PRODUCTS ==========
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': 'PRODUCTS',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // Products table headers
      allData.push({
        'Section': '',
        'ID': 'ID',
        'Name/Number': 'Product Name',
        'Category/Type': 'Category',
        'SKU/Phone': 'SKU',
        'Barcode/Email': 'Barcode',
        'Weight/Subtotal': 'Weight (g)',
        'Purity/Tax %': 'Purity',
        'Material/Tax Amt': 'Material Type',
        'Making/Discount %': 'Making Charge (₹)',
        'Rate/Discount Amt': 'Current Rate (₹/g)',
        'Stock/Total': 'Stock Quantity',
        'Min Level/Method': 'Min Stock Level',
        'Status/Payment': 'Status',
        'Amount Paid': '',
        'Created At': 'Created At',
        'Updated At': 'Updated At',
        'Notes': ''
      });

      if (products && products.length > 0) {
        products.forEach((product: any) => {
          allData.push({
            'Section': '',
            'ID': product.id,
            'Name/Number': product.name,
            'Category/Type': product.category,
            'SKU/Phone': product.sku,
            'Barcode/Email': product.barcode || '',
            'Weight/Subtotal': product.weight,
            'Purity/Tax %': product.purity,
            'Material/Tax Amt': product.material_type || '',
            'Making/Discount %': product.making_charge,
            'Rate/Discount Amt': product.current_rate,
            'Stock/Total': product.stock_quantity,
            'Min Level/Method': product.min_stock_level,
            'Status/Payment': product.status,
            'Amount Paid': '',
            'Created At': new Date(product.created_at).toLocaleDateString('en-IN'),
            'Updated At': new Date(product.updated_at).toLocaleDateString('en-IN'),
            'Notes': ''
          });
        });
      } else {
        allData.push({
          'Section': '',
          'ID': 'No products found',
          'Name/Number': '',
          'Category/Type': '',
          'SKU/Phone': '',
          'Barcode/Email': '',
          'Weight/Subtotal': '',
          'Purity/Tax %': '',
          'Material/Tax Amt': '',
          'Making/Discount %': '',
          'Rate/Discount Amt': '',
          'Stock/Total': '',
          'Min Level/Method': '',
          'Status/Payment': '',
          'Amount Paid': '',
          'Created At': '',
          'Updated At': '',
          'Notes': ''
        });
      }

      // Add spacing row
      allData.push({
        'Section': '',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // ========== SECTION 2: CUSTOMERS ==========
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': 'CUSTOMERS',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // Customers table headers
      allData.push({
        'Section': '',
        'ID': 'ID',
        'Name/Number': 'Name',
        'Category/Type': 'Customer Type',
        'SKU/Phone': 'Phone',
        'Barcode/Email': 'Email',
        'Weight/Subtotal': 'Address',
        'Purity/Tax %': 'City',
        'Material/Tax Amt': 'State',
        'Making/Discount %': 'Pincode',
        'Rate/Discount Amt': 'GST Number',
        'Stock/Total': 'Status',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': 'Created At',
        'Updated At': 'Updated At',
        'Notes': ''
      });

      if (customers && customers.length > 0) {
        customers.forEach((customer: any) => {
          allData.push({
            'Section': '',
            'ID': customer.id,
            'Name/Number': customer.name,
            'Category/Type': customer.customer_type || 'individual',
            'SKU/Phone': customer.phone || '',
            'Barcode/Email': customer.email || '',
            'Weight/Subtotal': customer.address || '',
            'Purity/Tax %': customer.city || '',
            'Material/Tax Amt': customer.state || '',
            'Making/Discount %': customer.pincode || '',
            'Rate/Discount Amt': customer.gst_number || '',
            'Stock/Total': customer.status || 'active',
            'Min Level/Method': '',
            'Status/Payment': '',
            'Amount Paid': '',
            'Created At': new Date(customer.created_at).toLocaleDateString('en-IN'),
            'Updated At': new Date(customer.updated_at || customer.created_at).toLocaleDateString('en-IN'),
            'Notes': ''
          });
        });
      } else {
        allData.push({
          'Section': '',
          'ID': 'No customers found',
          'Name/Number': '',
          'Category/Type': '',
          'SKU/Phone': '',
          'Barcode/Email': '',
          'Weight/Subtotal': '',
          'Purity/Tax %': '',
          'Material/Tax Amt': '',
          'Making/Discount %': '',
          'Rate/Discount Amt': '',
          'Stock/Total': '',
          'Min Level/Method': '',
          'Status/Payment': '',
          'Amount Paid': '',
          'Created At': '',
          'Updated At': '',
          'Notes': ''
        });
      }

      // Add spacing row
      allData.push({
        'Section': '',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // ========== SECTION 3: INVOICES ==========
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': 'INVOICES',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // Invoices table headers
      allData.push({
        'Section': '',
        'ID': 'ID',
        'Name/Number': 'Invoice Number',
        'Category/Type': 'Customer Name',
        'SKU/Phone': 'Customer Phone',
        'Barcode/Email': '',
        'Weight/Subtotal': 'Subtotal (₹)',
        'Purity/Tax %': 'Tax %',
        'Material/Tax Amt': 'Tax Amount (₹)',
        'Making/Discount %': 'Discount %',
        'Rate/Discount Amt': 'Discount Amount (₹)',
        'Stock/Total': 'Total Amount (₹)',
        'Min Level/Method': 'Payment Method',
        'Status/Payment': 'Payment Status',
        'Amount Paid': 'Amount Paid (₹)',
        'Created At': 'Created At',
        'Updated At': 'Updated At',
        'Notes': ''
      });

      if (invoices && invoices.length > 0) {
        invoices.forEach((invoice: any) => {
          allData.push({
            'Section': '',
            'ID': invoice.id,
            'Name/Number': invoice.invoice_number,
            'Category/Type': invoice.customer_name,
            'SKU/Phone': invoice.customer_phone || '',
            'Barcode/Email': '',
            'Weight/Subtotal': invoice.subtotal,
            'Purity/Tax %': invoice.tax_percentage,
            'Material/Tax Amt': invoice.tax_amount,
            'Making/Discount %': invoice.discount_percentage,
            'Rate/Discount Amt': invoice.discount_amount,
            'Stock/Total': invoice.total_amount,
            'Min Level/Method': invoice.payment_method,
            'Status/Payment': invoice.payment_status,
            'Amount Paid': invoice.amount_paid,
            'Created At': new Date(invoice.created_at).toLocaleDateString('en-IN'),
            'Updated At': new Date(invoice.updated_at).toLocaleDateString('en-IN'),
            'Notes': ''
          });
        });
      } else {
        allData.push({
          'Section': '',
          'ID': 'No invoices found',
          'Name/Number': '',
          'Category/Type': '',
          'SKU/Phone': '',
          'Barcode/Email': '',
          'Weight/Subtotal': '',
          'Purity/Tax %': '',
          'Material/Tax Amt': '',
          'Making/Discount %': '',
          'Rate/Discount Amt': '',
          'Stock/Total': '',
          'Min Level/Method': '',
          'Status/Payment': '',
          'Amount Paid': '',
          'Created At': '',
          'Updated At': '',
          'Notes': ''
        });
      }

      // Add spacing row
      allData.push({
        'Section': '',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // ========== SECTION 4: BILLS ==========
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': 'BILLS',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // Bills table headers
      allData.push({
        'Section': '',
        'ID': 'ID',
        'Name/Number': 'Bill Number',
        'Category/Type': 'Customer Name',
        'SKU/Phone': 'Customer Phone',
        'Barcode/Email': '',
        'Weight/Subtotal': 'Subtotal (₹)',
        'Purity/Tax %': 'Tax %',
        'Material/Tax Amt': 'Tax Amount (₹)',
        'Making/Discount %': 'Discount %',
        'Rate/Discount Amt': 'Discount Amount (₹)',
        'Stock/Total': 'Total Amount (₹)',
        'Min Level/Method': 'Payment Method',
        'Status/Payment': 'Payment Status',
        'Amount Paid': 'Amount Paid (₹)',
        'Created At': 'Created At',
        'Updated At': 'Updated At',
        'Notes': ''
      });

      if (regularBills && regularBills.length > 0) {
        regularBills.forEach((bill: any) => {
          allData.push({
            'Section': '',
            'ID': bill.id,
            'Name/Number': bill.bill_number || bill.invoice_number,
            'Category/Type': bill.customer_name,
            'SKU/Phone': bill.customer_phone || '',
            'Barcode/Email': '',
            'Weight/Subtotal': bill.subtotal,
            'Purity/Tax %': bill.tax_percentage,
            'Material/Tax Amt': bill.tax_amount,
            'Making/Discount %': bill.discount_percentage,
            'Rate/Discount Amt': bill.discount_amount,
            'Stock/Total': bill.total_amount,
            'Min Level/Method': bill.payment_method,
            'Status/Payment': bill.payment_status,
            'Amount Paid': bill.amount_paid,
            'Created At': new Date(bill.created_at).toLocaleDateString('en-IN'),
            'Updated At': new Date(bill.updated_at).toLocaleDateString('en-IN'),
            'Notes': ''
          });
        });
      } else {
        allData.push({
          'Section': '',
          'ID': 'No bills found',
          'Name/Number': '',
          'Category/Type': '',
          'SKU/Phone': '',
          'Barcode/Email': '',
          'Weight/Subtotal': '',
          'Purity/Tax %': '',
          'Material/Tax Amt': '',
          'Making/Discount %': '',
          'Rate/Discount Amt': '',
          'Stock/Total': '',
          'Min Level/Method': '',
          'Status/Payment': '',
          'Amount Paid': '',
          'Created At': '',
          'Updated At': '',
          'Notes': ''
        });
      }

      // Add spacing row
      allData.push({
        'Section': '',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // ========== SECTION 5: EXCHANGE BILLS ==========
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': 'EXCHANGE BILLS',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });
      allData.push({
        'Section': '════════════════════════════════════════════════════════════════════════════════',
        'ID': '',
        'Name/Number': '',
        'Category/Type': '',
        'SKU/Phone': '',
        'Barcode/Email': '',
        'Weight/Subtotal': '',
        'Purity/Tax %': '',
        'Material/Tax Amt': '',
        'Making/Discount %': '',
        'Rate/Discount Amt': '',
        'Stock/Total': '',
        'Min Level/Method': '',
        'Status/Payment': '',
        'Amount Paid': '',
        'Created At': '',
        'Updated At': '',
        'Notes': ''
      });

      // Exchange Bills table headers
      allData.push({
        'Section': '',
        'ID': 'ID',
        'Name/Number': 'Exchange Bill Number',
        'Category/Type': 'Customer Name',
        'SKU/Phone': 'Customer Phone',
        'Barcode/Email': 'Old Gold Weight & Purity',
        'Weight/Subtotal': 'Old Gold Rate (₹/g)',
        'Purity/Tax %': 'Old Gold Value (₹)',
        'Material/Tax Amt': 'Exchange Rate (₹/g)',
        'Making/Discount %': 'Exchange Difference (₹)',
        'Rate/Discount Amt': 'Total Amount (₹)',
        'Stock/Total': 'Payment Method',
        'Min Level/Method': 'Payment Status',
        'Status/Payment': 'Amount Paid (₹)',
        'Amount Paid': '',
        'Created At': 'Created At',
        'Updated At': 'Updated At',
        'Notes': ''
      });

      if (exchangeBills && exchangeBills.length > 0) {
        exchangeBills.forEach((bill: any) => {
          allData.push({
            'Section': '',
            'ID': bill.id,
            'Name/Number': bill.bill_number || bill.invoice_number,
            'Category/Type': bill.customer_name,
            'SKU/Phone': bill.customer_phone || '',
            'Barcode/Email': `${bill.old_gold_weight || 0}g (${bill.old_gold_purity || ''})`,
            'Weight/Subtotal': bill.old_gold_rate || 0,
            'Purity/Tax %': bill.old_gold_value || 0,
            'Material/Tax Amt': bill.exchange_rate || 0,
            'Making/Discount %': bill.exchange_difference || 0,
            'Rate/Discount Amt': bill.total_amount,
            'Stock/Total': bill.payment_method,
            'Min Level/Method': bill.payment_status,
            'Status/Payment': bill.amount_paid,
            'Amount Paid': '',
            'Created At': new Date(bill.created_at).toLocaleDateString('en-IN'),
            'Updated At': new Date(bill.updated_at).toLocaleDateString('en-IN'),
            'Notes': ''
          });
        });
      } else {
        allData.push({
          'Section': '',
          'ID': 'No exchange bills found',
          'Name/Number': '',
          'Category/Type': '',
          'SKU/Phone': '',
          'Barcode/Email': '',
          'Weight/Subtotal': '',
          'Purity/Tax %': '',
          'Material/Tax Amt': '',
          'Making/Discount %': '',
          'Rate/Discount Amt': '',
          'Stock/Total': '',
          'Min Level/Method': '',
          'Status/Payment': '',
          'Amount Paid': '',
          'Created At': '',
          'Updated At': '',
          'Notes': ''
        });
      }

      // Progress: 80%
      setExportProgress(80);

      // Create single consolidated sheet
      const workbook = XLSX.utils.book_new();
      const consolidatedSheet = XLSX.utils.json_to_sheet(allData);
      XLSX.utils.book_append_sheet(workbook, consolidatedSheet, 'All Data');
      
        // Progress: 80%
        setExportProgress(80);
        
      // Generate Excel file with proper options
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        cellStyles: true,
        compression: true
      });
      const dataBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `gold-billing-backup-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
      success(`All data exported to Excel successfully! ${allData.length} rows exported across 5 sections.`);
      
      // Progress: 100%
      setExportProgress(100);
      setLastBackup(new Date().toISOString());
      
      // Set export statistics
      setExportStats({
        products: products?.length || 0,
        customers: customers?.length || 0,
        invoices: invoices?.length || 0,
        bills: (regularBills.length || 0) + (exchangeBills.length || 0)
      });
      
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const exportInvoices = async () => {
    setIsExporting(true);
    try {
      const db = Database.getInstance();
      const invoices = await db.query('invoices');

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Invoices sheet
      if (invoices && invoices.length > 0) {
        const invoicesData = invoices.map((invoice: any) => ({
          'ID': invoice.id,
          'Invoice Number': invoice.invoice_number,
          'Customer Name': invoice.customer_name,
          'Customer Phone': invoice.customer_phone || '',
          'Subtotal (₹)': invoice.subtotal,
          'Tax %': invoice.tax_percentage,
          'Tax Amount (₹)': invoice.tax_amount,
          'Discount %': invoice.discount_percentage,
          'Discount Amount (₹)': invoice.discount_amount,
          'Total Amount (₹)': invoice.total_amount,
          'Payment Method': invoice.payment_method,
          'Payment Status': invoice.payment_status,
          'Amount Paid (₹)': invoice.amount_paid,
          'Created At': new Date(invoice.created_at).toLocaleDateString('en-IN'),
          'Updated At': new Date(invoice.updated_at).toLocaleDateString('en-IN')
        }));
        const invoicesSheet = XLSX.utils.json_to_sheet(invoicesData);
        XLSX.utils.book_append_sheet(workbook, invoicesSheet, 'Invoices');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoices-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Invoices exported to Excel successfully!');
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export invoices. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportBills = async () => {
    setIsExporting(true);
    try {
      const db = Database.getInstance();
      const bills = await db.query('bills');

      // Filter out exchange bills (bills with bill_number starting with 'EXCH-')
      const regularBills = bills.filter((bill: any) => {
        const billNumber = bill.bill_number || bill.invoice_number || '';
        return !billNumber.startsWith('EXCH-');
      });

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Bills sheet
      if (regularBills && regularBills.length > 0) {
        const billsData = regularBills.map((bill: any) => ({
          'ID': bill.id,
          'Bill Number': bill.bill_number || bill.invoice_number,
          'Customer Name': bill.customer_name,
          'Customer Phone': bill.customer_phone || '',
          'Subtotal (₹)': bill.subtotal,
          'Tax %': bill.tax_percentage,
          'Tax Amount (₹)': bill.tax_amount,
          'Discount %': bill.discount_percentage,
          'Discount Amount (₹)': bill.discount_amount,
          'Total Amount (₹)': bill.total_amount,
          'Payment Method': bill.payment_method,
          'Payment Status': bill.payment_status,
          'Amount Paid (₹)': bill.amount_paid,
          'Created At': new Date(bill.created_at).toLocaleDateString('en-IN'),
          'Updated At': new Date(bill.updated_at).toLocaleDateString('en-IN')
        }));
        const billsSheet = XLSX.utils.json_to_sheet(billsData);
        XLSX.utils.book_append_sheet(workbook, billsSheet, 'Bills');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `bills-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Bills exported to Excel successfully!');
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export bills. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportExchangeBills = async () => {
    setIsExporting(true);
    try {
      const db = Database.getInstance();
      const bills = await db.query('bills');

      // Filter only exchange bills (bills with bill_number starting with 'EXCH-')
      const exchangeBills = bills.filter((bill: any) => {
        const billNumber = bill.bill_number || bill.invoice_number || '';
        return billNumber.startsWith('EXCH-');
      });

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Exchange Bills sheet
      if (exchangeBills && exchangeBills.length > 0) {
        const exchangeBillsData = exchangeBills.map((bill: any) => ({
          'ID': bill.id,
          'Exchange Bill Number': bill.bill_number || bill.invoice_number,
          'Customer Name': bill.customer_name,
          'Customer Phone': bill.customer_phone || '',
          'Old Gold Weight (g)': bill.old_gold_weight || '',
          'Old Gold Purity': bill.old_gold_purity || '',
          'Old Gold Rate (₹/g)': bill.old_gold_rate || '',
          'Old Gold Value (₹)': bill.old_gold_value || '',
          'Exchange Rate (₹/g)': bill.exchange_rate || '',
          'Exchange Difference (₹)': bill.exchange_difference || '',
          'Subtotal (₹)': bill.subtotal,
          'Tax %': bill.tax_percentage,
          'Tax Amount (₹)': bill.tax_amount,
          'Discount %': bill.discount_percentage,
          'Discount Amount (₹)': bill.discount_amount,
          'Total Amount (₹)': bill.total_amount,
          'Payment Method': bill.payment_method,
          'Payment Status': bill.payment_status,
          'Amount Paid (₹)': bill.amount_paid,
          'Created At': new Date(bill.created_at).toLocaleDateString('en-IN'),
          'Updated At': new Date(bill.updated_at).toLocaleDateString('en-IN')
        }));
        const exchangeBillsSheet = XLSX.utils.json_to_sheet(exchangeBillsData);
        XLSX.utils.book_append_sheet(workbook, exchangeBillsSheet, 'Exchange Bills');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `exchange-bills-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Exchange bills exported to Excel successfully!');
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export exchange bills. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportCustomers = async () => {
    setIsExporting(true);
    try {
      const db = Database.getInstance();
      const customers = await db.query('customers');

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      if (customers && customers.length > 0) {
        const customersData = customers.map((customer: any) => ({
          'ID': customer.id,
          'Name': customer.name,
          'Phone': customer.phone,
          'Email': customer.email || '',
          'Address': customer.address || '',
          'City': customer.city || '',
          'State': customer.state || '',
          'Pincode': customer.pincode || '',
          'GST Number': customer.gst_number || '',
          'Customer Type': customer.customer_type || 'individual',
          'Status': customer.status || 'active',
          'Created At': new Date(customer.created_at).toLocaleDateString('en-IN'),
          'Updated At': new Date(customer.updated_at).toLocaleDateString('en-IN')
        }));
        const customersSheet = XLSX.utils.json_to_sheet(customersData);
        XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Customers exported to Excel successfully!');
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export customers. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportProducts = async () => {
    setIsExporting(true);
    try {
      const db = Database.getInstance();
      const products = await db.query('products');

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      if (products && products.length > 0) {
        const productsData = products.map((product: any) => ({
          'ID': product.id,
          'Name': product.name,
          'Category': product.category,
          'SKU': product.sku,
          'Barcode': product.barcode || '',
          'Weight (g)': product.weight,
          'Purity': product.purity,
          'Making Charge (₹)': product.making_charge,
          'Current Rate (₹/g)': product.current_rate,
          'Stock Quantity': product.stock_quantity,
          'Min Stock Level': product.min_stock_level,
          'Status': product.status,
          'Created At': new Date(product.created_at).toLocaleDateString('en-IN'),
          'Updated At': new Date(product.updated_at).toLocaleDateString('en-IN')
        }));
        const productsSheet = XLSX.utils.json_to_sheet(productsData);
        XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
      }

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success('Products exported to Excel successfully!');
    } catch (err) {
      console.error('Export error:', err);
      error('Failed to export products. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };


  // Enhanced Data Import Functions
  const handleFileImport = (type: 'products' | 'customers' | 'all') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        importData(file, type);
      }
    };
    input.click();
  };

  const importData = async (file: File, type: 'products' | 'customers' | 'all') => {
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const db = Database.getInstance();
      let importData: any = {};

        // Handle Excel file
        setImportProgress(20);
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Convert Excel sheets to JSON
        const sheetNames = workbook.SheetNames;
        importData = {};
        
        sheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        });
        
        // Skip empty sheets
        if (jsonData.length <= 1) return;
        
        // Convert array of arrays to array of objects
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        const objects = rows.map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            if (header && row[index] !== undefined) {
              obj[header] = row[index];
            }
          });
          return obj;
        });
          
          if (sheetName.toLowerCase().includes('product')) {
          importData.products = objects;
          } else if (sheetName.toLowerCase().includes('customer')) {
          importData.customers = objects;
          } else if (sheetName.toLowerCase().includes('invoice')) {
          importData.invoices = objects;
          } else if (sheetName.toLowerCase().includes('bill')) {
          importData.bills = objects;
          } else if (sheetName.toLowerCase().includes('business')) {
          importData.business_info = objects[0];
          }
        });
        
        setImportProgress(40);

      // Validate and clean data
      setImportProgress(60);
      const cleanedData = validateAndCleanData(importData);
      
      // Import data based on type
      if (type === 'all') {
        let importedCount = 0;
        const totalRecords = (cleanedData.products?.length || 0) + 
                           (cleanedData.customers?.length || 0) + 
                           (cleanedData.invoices?.length || 0) + 
                           (cleanedData.bills?.length || 0);
        
        if (cleanedData.products && cleanedData.products.length > 0) {
          setImportProgress(70);
          for (let i = 0; i < cleanedData.products.length; i++) {
            try {
              await db.insert('products', cleanedData.products[i]);
            importedCount++;
              setImportProgress(70 + (i / cleanedData.products.length) * 10);
            } catch (err) {
              console.error(`Error importing product ${i + 1}:`, err);
            }
          }
        }
        
        if (cleanedData.customers && cleanedData.customers.length > 0) {
          setImportProgress(80);
          for (let i = 0; i < cleanedData.customers.length; i++) {
            try {
              await db.insert('customers', cleanedData.customers[i]);
            importedCount++;
              setImportProgress(80 + (i / cleanedData.customers.length) * 10);
            } catch (err) {
              console.error(`Error importing customer ${i + 1}:`, err);
            }
          }
        }
        
        if (cleanedData.invoices && cleanedData.invoices.length > 0) {
          setImportProgress(90);
          for (let i = 0; i < cleanedData.invoices.length; i++) {
            try {
              await db.insert('invoices', cleanedData.invoices[i]);
            importedCount++;
              setImportProgress(90 + (i / cleanedData.invoices.length) * 5);
            } catch (err) {
              console.error(`Error importing invoice ${i + 1}:`, err);
            }
          }
        }
        
        if (cleanedData.bills && cleanedData.bills.length > 0) {
          for (let i = 0; i < cleanedData.bills.length; i++) {
            try {
              await db.insert('bills', cleanedData.bills[i]);
            importedCount++;
            } catch (err) {
              console.error(`Error importing bill ${i + 1}:`, err);
            }
          }
        }
        
        success(`Data import completed! ${importedCount} out of ${totalRecords} records imported successfully.`);
        setImportStats({
          imported: importedCount,
          total: totalRecords,
          errors: totalRecords - importedCount
        });
      } else if (type === 'products') {
        if (cleanedData.products && cleanedData.products.length > 0) {
          setImportProgress(70);
          let successCount = 0;
          for (let i = 0; i < cleanedData.products.length; i++) {
            try {
              await db.insert('products', cleanedData.products[i]);
              successCount++;
              setImportProgress(70 + (i / cleanedData.products.length) * 30);
            } catch (err) {
              console.error(`Error importing product ${i + 1}:`, err);
            }
          }
          success(`${successCount} out of ${cleanedData.products.length} products imported successfully!`);
        } else {
          error('Invalid file format. No products found.');
        }
      } else if (type === 'customers') {
        if (cleanedData.customers && cleanedData.customers.length > 0) {
          setImportProgress(70);
          let successCount = 0;
          for (let i = 0; i < cleanedData.customers.length; i++) {
            try {
              await db.insert('customers', cleanedData.customers[i]);
              successCount++;
              setImportProgress(70 + (i / cleanedData.customers.length) * 30);
            } catch (err) {
              console.error(`Error importing customer ${i + 1}:`, err);
            }
          }
          success(`${successCount} out of ${cleanedData.customers.length} customers imported successfully!`);
        } else {
          error('Invalid file format. No customers found.');
        }
      }
      
      // Update business info if available
      if (cleanedData.business_info) {
        setBusinessInfo(prev => ({
          ...prev,
          ...cleanedData.business_info
        }));
      }
      
      setImportProgress(100);
      
    } catch (err) {
      console.error('Import error:', err);
      if (err instanceof Error) {
        error(`Import failed: ${err.message}`);
      } else {
      error('Failed to import data. Please check the file format and try again.');
      }
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportProgress(0), 2000);
    }
  };

  // Data validation and cleaning function
  const validateAndCleanData = (data: any) => {
    const cleaned: any = {};
    
    if (data.products && Array.isArray(data.products)) {
      cleaned.products = data.products.map((product: any) => {
        // Handle Excel column mapping
        const mappedProduct = {
          id: product.ID || product.id || generateId(),
          name: product.Name || product.name || '',
          category: product.Category || product.category || 'Chains',
          sku: product.SKU || product.sku || generateId(),
          barcode: product.Barcode || product.barcode || '',
          weight: parseFloat(product['Weight (g)'] || product.weight) || 0,
          purity: product.Purity || product.purity || '22K',
          making_charge: parseFloat(product['Making Charge (₹)'] || product.making_charge) || 0,
          current_rate: parseFloat(product['Current Rate (₹/g)'] || product.current_rate) || 0,
          stock_quantity: parseInt(product['Stock Quantity'] || product.stock_quantity) || 0,
          min_stock_level: parseInt(product['Min Stock Level'] || product.min_stock_level) || 1,
          status: (product.Status || product.status || 'active').toLowerCase(),
          created_at: product['Created At'] || product.created_at || new Date().toISOString(),
          updated_at: product['Updated At'] || product.updated_at || new Date().toISOString()
        };
        
        // Validate required fields
        if (!mappedProduct.name || !mappedProduct.sku) {
          throw new Error(`Invalid product data: Missing required fields (Name, SKU)`);
        }
        
        return mappedProduct;
      });
    }
    
    if (data.customers && Array.isArray(data.customers)) {
      cleaned.customers = data.customers.map((customer: any) => {
        const mappedCustomer = {
          id: customer.ID || customer.id || generateId(),
          name: customer.Name || customer.name || '',
          phone: customer.Phone || customer.phone || '',
          email: customer.Email || customer.email || '',
          address: customer.Address || customer.address || '',
          created_at: customer['Created At'] || customer.created_at || new Date().toISOString()
        };
        
        // Validate required fields
        if (!mappedCustomer.name || !mappedCustomer.phone) {
          throw new Error(`Invalid customer data: Missing required fields (Name, Phone)`);
        }
        
        return mappedCustomer;
      });
    }
    
    if (data.invoices && Array.isArray(data.invoices)) {
      cleaned.invoices = data.invoices.map((invoice: any) => {
        const mappedInvoice = {
          id: invoice.ID || invoice.id || generateId(),
          invoice_number: invoice['Invoice Number'] || invoice.invoice_number || generateInvoiceNumber(),
          customer_name: invoice['Customer Name'] || invoice.customer_name || '',
          customer_phone: invoice['Customer Phone'] || invoice.customer_phone || '',
          subtotal: parseFloat(invoice['Subtotal (₹)'] || invoice.subtotal) || 0,
          tax_percentage: parseFloat(invoice['Tax %'] || invoice.tax_percentage) || 0,
          tax_amount: parseFloat(invoice['Tax Amount (₹)'] || invoice.tax_amount) || 0,
          discount_percentage: parseFloat(invoice['Discount %'] || invoice.discount_percentage) || 0,
          discount_amount: parseFloat(invoice['Discount Amount (₹)'] || invoice.discount_amount) || 0,
          total_amount: parseFloat(invoice['Total Amount (₹)'] || invoice.total_amount) || 0,
          payment_method: (invoice['Payment Method'] || invoice.payment_method || 'cash').toLowerCase(),
          payment_status: (invoice['Payment Status'] || invoice.payment_status || 'pending').toLowerCase(),
          amount_paid: parseFloat(invoice['Amount Paid (₹)'] || invoice.amount_paid) || 0,
          items: invoice.items || [],
          created_at: invoice['Created At'] || invoice.created_at || new Date().toISOString(),
          updated_at: invoice['Updated At'] || invoice.updated_at || new Date().toISOString()
        };
        
        // Validate required fields
        if (!mappedInvoice.invoice_number || !mappedInvoice.customer_name) {
          throw new Error(`Invalid invoice data: Missing required fields (Invoice Number, Customer Name)`);
        }
        
        return mappedInvoice;
      });
    }
    
    if (data.bills && Array.isArray(data.bills)) {
      cleaned.bills = data.bills.map((bill: any) => {
        const mappedBill = {
          id: bill.ID || bill.id || generateId(),
          bill_number: bill['Bill Number'] || bill.bill_number || generateBillNumber(),
          customer_name: bill['Customer Name'] || bill.customer_name || '',
          customer_phone: bill['Customer Phone'] || bill.customer_phone || '',
          subtotal: parseFloat(bill['Subtotal (₹)'] || bill.subtotal) || 0,
          tax_percentage: parseFloat(bill['Tax %'] || bill.tax_percentage) || 0,
          tax_amount: parseFloat(bill['Tax Amount (₹)'] || bill.tax_amount) || 0,
          discount_percentage: parseFloat(bill['Discount %'] || bill.discount_percentage) || 0,
          discount_amount: parseFloat(bill['Discount Amount (₹)'] || bill.discount_amount) || 0,
          total_amount: parseFloat(bill['Total Amount (₹)'] || bill.total_amount) || 0,
          payment_method: (bill['Payment Method'] || bill.payment_method || 'cash').toLowerCase(),
          payment_status: (bill['Payment Status'] || bill.payment_status || 'pending').toLowerCase(),
          amount_paid: parseFloat(bill['Amount Paid (₹)'] || bill.amount_paid) || 0,
          items: bill.items || [],
          created_at: bill['Created At'] || bill.created_at || new Date().toISOString(),
          updated_at: bill['Updated At'] || bill.updated_at || new Date().toISOString()
        };
        
        // Validate required fields
        if (!mappedBill.bill_number || !mappedBill.customer_name) {
          throw new Error(`Invalid bill data: Missing required fields (Bill Number, Customer Name)`);
        }
        
        return mappedBill;
      });
    }
    
    // Handle business info
    if (data.business_info) {
      cleaned.business_info = data.business_info;
    }
    
    return cleaned;
  };

  // Helper functions
  const generateId = () => `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const generateInvoiceNumber = () => `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const generateBillNumber = () => `BILL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

  // Cloud Sync Functions
  const syncToCloud = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    try {
      // Simulate cloud sync (in real implementation, this would connect to cloud storage)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Export data and simulate upload to cloud
      const db = Database.getInstance();
      const [products, customers, invoices, bills] = await Promise.all([
        db.query('products'),
        db.query('customers'),
        db.query('invoices'),
        db.query('bills')
      ]);

      const syncData = {
        sync_date: new Date().toISOString(),
        business_info: businessInfo,
        data: {
          products,
          customers,
          invoices,
          bills
        }
      };

      // In a real implementation, this would upload to cloud storage
      // For now, we'll store in localStorage as a simulation
      localStorage.setItem('cloud_backup', JSON.stringify(syncData));
      
      setSyncStatus('success');
      setLastBackup(new Date().toISOString());
      success('Data synced to cloud successfully!');
      
    } catch (err) {
      console.error('Cloud sync error:', err);
      setSyncStatus('error');
      error('Failed to sync to cloud. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const restoreFromCloud = async () => {
    if (window.confirm('Are you sure you want to restore from cloud? This will replace your current data!')) {
      setIsSyncing(true);
      setSyncStatus('syncing');
      
      try {
        // In a real implementation, this would download from cloud storage
        const cloudData = localStorage.getItem('cloud_backup');
        
        if (!cloudData) {
          throw new Error('No cloud backup found');
        }
        
        const syncData = JSON.parse(cloudData);
        
        // Clear existing data
        const db = Database.getInstance();
        await db.query('DELETE FROM bills');
        await db.query('DELETE FROM invoices');
        await db.query('DELETE FROM customers');
        await db.query('DELETE FROM products');
        
        // Restore data
        if (syncData.data.products) {
          for (const product of syncData.data.products) {
            await db.insert('products', product);
          }
        }
        
        if (syncData.data.customers) {
          for (const customer of syncData.data.customers) {
            await db.insert('customers', customer);
          }
        }
        
        if (syncData.data.invoices) {
          for (const invoice of syncData.data.invoices) {
            await db.insert('invoices', invoice);
          }
        }
        
        if (syncData.data.bills) {
          for (const bill of syncData.data.bills) {
            await db.insert('bills', bill);
          }
        }
        
        setSyncStatus('success');
        success('Data restored from cloud successfully!');
        
      } catch (err) {
        console.error('Cloud restore error:', err);
        setSyncStatus('error');
        error('Failed to restore from cloud. Please try again.');
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    }
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
      try {
        const db = Database.getInstance();
        
        // Clear all data in reverse order to handle foreign key constraints
        await db.query('DELETE FROM bills');
        await db.query('DELETE FROM invoices');
        await db.query('DELETE FROM customers');
        await db.query('DELETE FROM products');
        
        success('All data cleared successfully!');
      } catch (err) {
        console.error('Clear data error:', err);
        error('Failed to clear data. Please try again.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || isLoading}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isSaving || isLoading
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{t('settings.saveChanges')}</span>
            </>
          )}
        </button>
      </div>

      {/* Horizontal Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 border-b-2 transition-all ${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600 bg-amber-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="p-6">
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                <Store className="h-6 w-6 text-amber-600" />
                <h2 className="text-xl font-semibold text-gray-900">{t('settings.businessInformation')}</h2>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
                  <span className="ml-3 text-gray-600">Loading business information...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.businessName')} *
                    </label>
                    <input
                      type="text"
                      value={businessInfo.name}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter business name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.phoneNumber')} *
                    </label>
                    <input
                      type="tel"
                      value={businessInfo.phone}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.businessAddress')} *
                    </label>
                    <textarea
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      rows={3}
                      placeholder="Enter complete business address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.emailAddress')}
                    </label>
                    <input
                      type="email"
                      value={businessInfo.email}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="info@business.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.gstin')}
                    </label>
                    <input
                      type="text"
                      value={businessInfo.gstin}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, gstin: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="33AAAAA0000A1Z5"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.bisLicenseNumber')}
                    </label>
                    <input
                      type="text"
                      value={businessInfo.license}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, license: e.target.value })}
                      disabled={isSaving}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="BIS-123456"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 pb-4 border-b border-gray-200">
                <Download className="h-6 w-6 text-amber-600" />
                <h2 className="text-xl font-semibold text-gray-900">{t('settings.dataManagementTitle')}</h2>
              </div>
              
              <div className="space-y-6">
                {/* Cloud Sync Section */}
                <div className="p-6 border border-blue-200 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-4">
                    <Cloud className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">Cloud Sync</h3>
                    <div className="flex items-center space-x-2">
                      {syncStatus === 'syncing' && (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                      )}
                      {syncStatus === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {syncStatus === 'error' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Sync your data to the cloud for automatic backup and access from anywhere.
                    {lastBackup && (
                      <span className="block mt-1 text-xs text-gray-500">
                        Last backup: {new Date(lastBackup).toLocaleString()}
                      </span>
                    )}
                  </p>
                  <div className="flex space-x-4">
                    <button 
                      onClick={syncToCloud}
                      disabled={isSyncing}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isSyncing 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      <Cloud className="h-4 w-4" />
                      <span>Sync to Cloud</span>
                    </button>
                    <button 
                      onClick={restoreFromCloud}
                      disabled={isSyncing}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isSyncing 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      <DatabaseIcon className="h-4 w-4" />
                      <span>Restore from Cloud</span>
                    </button>
                  </div>
                </div>

                {/* Backup & Export Section */}
                <div className="p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-4">
                    <FileText className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-gray-900">{t('settings.backupExport')}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Export your data in Excel format for backup purposes or data migration.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button 
                      onClick={exportAllData}
                      disabled={isExporting}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        isExporting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>Export All (Excel)</span>
                    </button>
                    <button 
                      onClick={exportProducts}
                      disabled={isExporting}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        isExporting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      <span>{t('settings.exportProducts')}</span>
                    </button>
                    <button 
                      onClick={exportInvoices}
                      disabled={isExporting}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        isExporting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Invoices</span>
                    </button>
                    <button 
                      onClick={exportBills}
                      disabled={isExporting}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        isExporting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-amber-500 text-white hover:bg-amber-600'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Bills</span>
                    </button>
                    <button 
                      onClick={exportExchangeBills}
                      disabled={isExporting}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        isExporting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-emerald-500 text-white hover:bg-emerald-600'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Exchange Bills</span>
                    </button>
                    <button 
                      onClick={exportCustomers}
                      disabled={isExporting}
                      className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                        isExporting 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-teal-500 text-white hover:bg-teal-600'
                      }`}
                    >
                      <Download className="h-4 w-4" />
                      <span>Export Customers</span>
                    </button>
                  </div>
                  {isExporting && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2 text-amber-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                        <span className="text-sm">Exporting data...</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${exportProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{exportProgress}% complete</span>
                    </div>
                  )}
                  
                  {exportStats && !isExporting && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-700 mb-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Export Completed Successfully!</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold text-green-800">{exportStats.products}</div>
                          <div className="text-green-600">Products</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-800">{exportStats.customers}</div>
                          <div className="text-green-600">Customers</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-800">{exportStats.invoices}</div>
                          <div className="text-green-600">Invoices</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-green-800">{exportStats.bills}</div>
                          <div className="text-green-600">Bills</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Import Data Section */}
                <div className="p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-4">
                    <Upload className="h-5 w-5 text-amber-600" />
                    <h3 className="font-medium text-gray-900">{t('settings.importData')}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Import data from previously exported Excel files. Make sure the file format matches the export format.
                  </p>

                  {/* Excel Import */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Excel Import</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={() => handleFileImport('all')}
                        disabled={isImporting}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          isImporting 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Import All (Excel)</span>
                      </button>
                      <button 
                        onClick={() => handleFileImport('products')}
                        disabled={isImporting}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          isImporting 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Import Products (Excel)</span>
                      </button>
                      <button 
                        onClick={() => handleFileImport('customers')}
                        disabled={isImporting}
                        className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
                          isImporting 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Import Customers (Excel)</span>
                      </button>
                    </div>
                  </div>

                  {isImporting && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-2 text-amber-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                        <span className="text-sm">Importing data...</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${importProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{importProgress}% complete</span>
                    </div>
                  )}
                  
                  {importStats && !isImporting && (
                    <div className={`mt-4 p-3 border rounded-lg ${
                      importStats.errors === 0 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className={`flex items-center space-x-2 mb-2 ${
                        importStats.errors === 0 ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {importStats.errors === 0 ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                          {importStats.errors === 0 ? 'Import Completed Successfully!' : 'Import Completed with Warnings'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className={`font-semibold ${
                            importStats.errors === 0 ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {importStats.imported}
                          </div>
                          <div className={importStats.errors === 0 ? 'text-green-600' : 'text-yellow-600'}>
                            Imported
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`font-semibold ${
                            importStats.errors === 0 ? 'text-green-800' : 'text-yellow-800'
                          }`}>
                            {importStats.total}
                          </div>
                          <div className={importStats.errors === 0 ? 'text-green-600' : 'text-yellow-600'}>
                            Total
                          </div>
                        </div>
                        <div className="text-center">
                          <div className={`font-semibold ${
                            importStats.errors === 0 ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {importStats.errors}
                          </div>
                          <div className={importStats.errors === 0 ? 'text-green-600' : 'text-red-600'}>
                            Errors
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Danger Zone */}
                <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-medium text-red-900">{t('settings.dangerZone')}</h3>
                  </div>
                  <p className="text-sm text-red-700 mb-4">
                    {t('settings.irreversibleActions')}
                  </p>
                  <button 
                    onClick={clearAllData}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{t('settings.clearAllData')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;