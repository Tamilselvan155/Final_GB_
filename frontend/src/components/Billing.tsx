import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  User,
  ShoppingCart,
  Download,
  Trash2,
  Check,
  X,
  FileText,
  CreditCard
} from 'lucide-react';
import jsPDF from 'jspdf';
import Database from '../utils/database';
import { Product, Bill, Invoice, InvoiceItem, Customer } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const Billing: React.FC = () => {
  const { t } = useLanguage();
  const { success, error, loading, dismiss } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentBill, setCurrentBill] = useState<Partial<Bill>>({
    items: [],
    subtotal: 0,
    tax_percentage: 3,
    tax_amount: 0,
    discount_percentage: 0,
    discount_amount: 0,
    total_amount: 0,
    payment_method: 'cash',
    payment_status: 'pending',
    amount_paid: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'billing' | 'invoice'>('invoice');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [currentBill.items, currentBill.tax_percentage, currentBill.discount_percentage]);

  const loadData = async () => {
    try {
      const db = Database.getInstance();
      const [productData, customerData, billData, invoiceData] = await Promise.all([
        db.getProducts(),
        db.getCustomers(),
        db.getBills(),
        db.getInvoices()
      ]);
      
      setProducts(productData.filter((p: Product) => p.status === 'active'));
      setCustomers(customerData);
      setRecentBills(billData.reverse());
      setRecentInvoices(invoiceData.reverse());
    } catch (err) {
      console.error('Error loading data:', err);
      error('Failed to load data. Please try again.');
    }
  };

  const calculateTotals = () => {
    const items = currentBill.items || [];
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    const discountAmount = (subtotal * (currentBill.discount_percentage || 0)) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = (discountedSubtotal * (currentBill.tax_percentage || 0)) / 100;
    const totalAmount = discountedSubtotal + taxAmount;

    setCurrentBill(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
    }));
  };

  const addProductToBill = (product: Product) => {
    const existingItemIndex = (currentBill.items || []).findIndex(
      item => item.product_id === product.id
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...(currentBill.items || [])];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total = 
        (updatedItems[existingItemIndex].weight * updatedItems[existingItemIndex].rate + 
         updatedItems[existingItemIndex].making_charge) * updatedItems[existingItemIndex].quantity;
      
      setCurrentBill(prev => ({ ...prev, items: updatedItems }));
    } else {
      const newItem: InvoiceItem = {
        id: Date.now().toString(),
        product_id: product.id,
        product_name: product.name,
        weight: product.weight,
        rate: product.current_rate,
        making_charge: product.making_charge,
        quantity: 1,
        total: (product.weight * product.current_rate) + product.making_charge,
      };

      setCurrentBill(prev => ({
        ...prev,
        items: [...(prev.items || []), newItem],
      }));
    }
  };

  const updateBillItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    const updatedItems = (currentBill.items || []).map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, ...updates };
        
        // Validate numeric inputs
        if (updates.weight !== undefined && (isNaN(updates.weight) || updates.weight <= 0)) {
          return item;
        }
        if (updates.rate !== undefined && (isNaN(updates.rate) || updates.rate <= 0)) {
          return item;
        }
        if (updates.quantity !== undefined && (isNaN(updates.quantity) || updates.quantity <= 0)) {
          return item;
        }
        if (updates.making_charge !== undefined && (isNaN(updates.making_charge) || updates.making_charge < 0)) {
          return item;
        }
        
        updatedItem.total = (updatedItem.weight * updatedItem.rate + updatedItem.making_charge) * updatedItem.quantity;
        return updatedItem;
      }
      return item;
    });

    setCurrentBill(prev => ({ ...prev, items: updatedItems }));
  };

  const removeBillItem = (itemId: string) => {
    setCurrentBill(prev => ({
      ...prev,
      items: (prev.items || []).filter(item => item.id !== itemId),
    }));
  };

  const saveBill = async () => {
    if (!currentBill.items?.length) {
      error('Please add at least one item to the bill');
      return;
    }

    if (!selectedCustomer && !currentBill.customer_name) {
      error('Please select a customer or enter customer details');
      return;
    }

    // Check stock availability before creating bill (now deducts stock)
    for (const item of currentBill.items || []) {
      const product = products.find(p => p.id === item.product_id);
      if (product && product.stock_quantity < item.quantity) {
        error(`Insufficient stock for ${item.product_name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
        return;
      }
    }

    loading('Creating bill...');
    
    try {
      const db = Database.getInstance();
      const billNumber = `BILL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const billData = {
        invoice_number: billNumber, // API expects invoice_number but stores as bill_number
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || currentBill.customer_name,
        customer_phone: selectedCustomer?.phone || currentBill.customer_phone,
        items: currentBill.items,
        subtotal: currentBill.subtotal,
        tax_percentage: currentBill.tax_percentage,
        tax_amount: currentBill.tax_amount,
        discount_percentage: currentBill.discount_percentage,
        discount_amount: currentBill.discount_amount,
        total_amount: currentBill.total_amount,
        payment_method: currentBill.payment_method,
        payment_status: currentBill.payment_status,
        amount_paid: currentBill.amount_paid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.createBill(billData);
      
      // Deduct inventory for each item (now deducts stock)
      for (const item of currentBill.items || []) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          await db.updateProduct(item.product_id, {
            stock_quantity: product.stock_quantity - item.quantity
          });
        }
      }
      
      // Reset the form
      setCurrentBill({
        items: [],
        subtotal: 0,
        tax_percentage: 3,
        tax_amount: 0,
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: 0,
        payment_method: 'cash',
        payment_status: 'pending',
        amount_paid: 0,
      });
      setSelectedCustomer(null);
      
      // Reload recent bills
      await loadData();
      
      success('Bill saved successfully and inventory updated!');
    } catch (err) {
      console.error('Error saving bill:', err);
      error('Failed to save bill. Please try again.');
    } finally {
      dismiss();
    }
  };

  const saveInvoice = async () => {
    if (!currentBill.items?.length) {
      error('Please add at least one item to the invoice');
      return;
    }

    if (!selectedCustomer && !currentBill.customer_name) {
      error('Please select a customer or enter customer details');
      return;
    }

    loading('Creating invoice...');

    try {
      const db = Database.getInstance();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const invoiceData = {
        invoice_number: invoiceNumber,
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || currentBill.customer_name,
        customer_phone: selectedCustomer?.phone || currentBill.customer_phone,
        items: currentBill.items,
        subtotal: currentBill.subtotal,
        tax_percentage: currentBill.tax_percentage,
        tax_amount: currentBill.tax_amount,
        discount_percentage: currentBill.discount_percentage,
        discount_amount: currentBill.discount_amount,
        total_amount: currentBill.total_amount,
        payment_method: currentBill.payment_method,
        payment_status: currentBill.payment_status,
        amount_paid: currentBill.amount_paid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await db.createInvoice(invoiceData);
      
      // Reset the form
      setCurrentBill({
        items: [],
        subtotal: 0,
        tax_percentage: 3,
        tax_amount: 0,
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: 0,
        payment_method: 'cash',
        payment_status: 'pending',
        amount_paid: 0,
      });
      setSelectedCustomer(null);
      
      // Reload data
      await loadData();
      
      success('Invoice saved successfully!');
    } catch (err) {
      console.error('Error saving invoice:', err);
      error('Failed to save invoice. Please try again.');
    } finally {
      dismiss();
    }
  };

  const CustomerModal: React.FC<{
    onClose: () => void;
    onSelect: (customer: Customer) => void;
  }> = ({ onClose, onSelect }) => {
    const [newCustomer, setNewCustomer] = useState({
      name: '',
      phone: '',
      email: '',
      address: '',
    });

    const handleAddCustomer = async () => {
      if (!newCustomer.name || !newCustomer.phone) {
        error('Name and phone are required');
        return;
      }

      try {
        const db = Database.getInstance();
        const customerData = await db.createCustomer(newCustomer);
        setCustomers([...customers, customerData]);
        onSelect(customerData);
        onClose();
        success('Customer created successfully!');
      } catch (err) {
        console.error('Error creating customer:', err);
        error('Failed to create customer. Please try again.');
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Select Customer</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Add New Customer */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Add New Customer</h3>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number *"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Address (Optional)"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <button
                onClick={handleAddCustomer}
                className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Add Customer
              </button>
            </div>

            {/* Existing Customers */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Existing Customers</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => {
                      onSelect(customer);
                      onClose();
                    }}
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-600">{customer.phone}</p>
                      </div>
                      <Check className="h-5 w-5 text-amber-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateBillPDF = (bill: Bill) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('GOLD BILLING PRO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('BILL', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Bill Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bill Number: ${bill.bill_number}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Date: ${new Date(bill.created_at).toLocaleDateString('en-IN')}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Customer: ${bill.customer_name}`, margin, yPosition);
    yPosition += 8;
    if (bill.customer_phone) {
      doc.text(`Phone: ${bill.customer_phone}`, margin, yPosition);
      yPosition += 8;
    }
    yPosition += 10;

    // Items Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('Item', margin, yPosition);
    doc.text('Weight (g)', margin + 60, yPosition);
    doc.text('Rate', margin + 90, yPosition);
    doc.text('Qty', margin + 120, yPosition);
    doc.text('Total', margin + 140, yPosition);
    yPosition += 8;

    // Draw line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Items
    doc.setFont('helvetica', 'normal');
    if (bill.items && Array.isArray(bill.items)) {
      bill.items.forEach((item: any) => {
        doc.text(item.product_name || 'N/A', margin, yPosition);
        doc.text(item.weight?.toString() || '0', margin + 60, yPosition);
        doc.text(`₹${item.rate?.toLocaleString() || '0'}`, margin + 90, yPosition);
        doc.text(item.quantity?.toString() || '1', margin + 120, yPosition);
        doc.text(`₹${item.total?.toLocaleString() || '0'}`, margin + 140, yPosition);
        yPosition += 8;
      });
    }

    yPosition += 10;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Totals
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: ₹${bill.subtotal?.toLocaleString() || '0'}`, margin + 100, yPosition);
    yPosition += 8;
    if (bill.discount_amount && bill.discount_amount > 0) {
      doc.text(`Discount (${bill.discount_percentage}%): -₹${bill.discount_amount.toLocaleString()}`, margin + 100, yPosition);
      yPosition += 8;
    }
    if (bill.tax_amount && bill.tax_amount > 0) {
      doc.text(`Tax (${bill.tax_percentage}%): ₹${bill.tax_amount.toLocaleString()}`, margin + 100, yPosition);
      yPosition += 8;
    }
    doc.setFontSize(14);
    doc.text(`Total Amount: ₹${bill.total_amount?.toLocaleString() || '0'}`, margin + 100, yPosition);
    yPosition += 15;

    // Payment Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${bill.payment_method?.toUpperCase() || 'CASH'}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Payment Status: ${bill.payment_status?.toUpperCase() || 'PENDING'}`, margin, yPosition);
    if (bill.amount_paid && bill.amount_paid > 0) {
      yPosition += 8;
      doc.text(`Amount Paid: ₹${bill.amount_paid.toLocaleString()}`, margin, yPosition);
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });

    // Download
    doc.save(`Bill-${bill.bill_number}.pdf`);
    success('Bill PDF downloaded successfully!');
  };

  const generateInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('GOLD BILLING PRO', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('INVOICE', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Invoice Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Invoice Number: ${invoice.invoice_number}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString('en-IN')}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Customer: ${invoice.customer_name}`, margin, yPosition);
    yPosition += 8;
    if (invoice.customer_phone) {
      doc.text(`Phone: ${invoice.customer_phone}`, margin, yPosition);
      yPosition += 8;
    }
    yPosition += 10;

    // Items Table Header
    doc.setFont('helvetica', 'bold');
    doc.text('Item', margin, yPosition);
    doc.text('Weight (g)', margin + 60, yPosition);
    doc.text('Rate', margin + 90, yPosition);
    doc.text('Qty', margin + 120, yPosition);
    doc.text('Total', margin + 140, yPosition);
    yPosition += 8;

    // Draw line
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    // Items
    doc.setFont('helvetica', 'normal');
    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach((item: any) => {
        doc.text(item.product_name || 'N/A', margin, yPosition);
        doc.text(item.weight?.toString() || '0', margin + 60, yPosition);
        doc.text(`₹${item.rate?.toLocaleString() || '0'}`, margin + 90, yPosition);
        doc.text(item.quantity?.toString() || '1', margin + 120, yPosition);
        doc.text(`₹${item.total?.toLocaleString() || '0'}`, margin + 140, yPosition);
        yPosition += 8;
      });
    }

    yPosition += 10;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Totals
    doc.setFont('helvetica', 'bold');
    doc.text(`Subtotal: ₹${invoice.subtotal?.toLocaleString() || '0'}`, margin + 100, yPosition);
    yPosition += 8;
    if (invoice.discount_amount && invoice.discount_amount > 0) {
      doc.text(`Discount (${invoice.discount_percentage}%): -₹${invoice.discount_amount.toLocaleString()}`, margin + 100, yPosition);
      yPosition += 8;
    }
    if (invoice.tax_amount && invoice.tax_amount > 0) {
      doc.text(`Tax (${invoice.tax_percentage}%): ₹${invoice.tax_amount.toLocaleString()}`, margin + 100, yPosition);
      yPosition += 8;
    }
    doc.setFontSize(14);
    doc.text(`Total Amount: ₹${invoice.total_amount?.toLocaleString() || '0'}`, margin + 100, yPosition);
    yPosition += 15;

    // Payment Details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Payment Method: ${invoice.payment_method?.toUpperCase() || 'CASH'}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Payment Status: ${invoice.payment_status?.toUpperCase() || 'PENDING'}`, margin, yPosition);
    if (invoice.amount_paid && invoice.amount_paid > 0) {
      yPosition += 8;
      doc.text(`Amount Paid: ₹${invoice.amount_paid.toLocaleString()}`, margin, yPosition);
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.text('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });

    // Download
    doc.save(`Invoice-${invoice.invoice_number}.pdf`);
    success('Invoice PDF downloaded successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('billing.title')}</h1>
          <p className="text-gray-600 mt-1">{t('billing.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="h-4 w-4" />
            <span>{t('billing.reports')}</span>
          </button>
          {activeTab === 'billing' ? (
            <button
              onClick={saveBill}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              <span>Create Bill</span>
            </button>
          ) : (
            <button
              onClick={saveInvoice}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Create Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('billing')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'billing'
                ? 'bg-amber-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Billing (Deduct Stock)</span>
          </button>
          <button
            onClick={() => setActiveTab('invoice')}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
              activeTab === 'invoice'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Invoice (Quote/Estimate)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Select Customer</span>
              </button>
            </div>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && (
                    <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-amber-600 hover:text-amber-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={currentBill.customer_name || ''}
                  onChange={(e) => setCurrentBill(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={currentBill.customer_phone || ''}
                  onChange={(e) => setCurrentBill(prev => ({ ...prev, customer_phone: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Product Search */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add Products</h2>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-64"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => addProductToBill(product)}
                  className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.weight}g • {product.purity}</p>
                      <p className="text-sm font-medium text-amber-600">
                        ₹{((product.weight * product.current_rate) + product.making_charge).toLocaleString()}
                      </p>
                      {activeTab === 'billing' && (
                        <p className="text-xs text-gray-500">Stock: {product.stock_quantity}</p>
                      )}
                    </div>
                    <Plus className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bill/Invoice Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'billing' ? 'Bill Items (Deduct Stock)' : 'Invoice Items (Quote/Estimate)'}
            </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Item</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Weight</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Rate</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Qty</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(currentBill.items || []).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">Making: ₹{item.making_charge}</p>
                        {activeTab === 'billing' && (
                          <p className="text-xs text-gray-500">
                            Stock: {products.find(p => p.id === item.product_id)?.stock_quantity || 0}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.weight}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              updateBillItem(item.id, { weight: value });
                            }
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                        <span className="text-sm text-gray-600 ml-1">g</span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.rate}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              updateBillItem(item.id, { rate: value });
                            }
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              updateBillItem(item.id, { quantity: value });
                            }
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">₹{item.total.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => removeBillItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {!(currentBill.items?.length) && (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    No items added to {activeTab === 'billing' ? 'bill (deduct stock)' : 'invoice (quote/estimate)'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill/Invoice Summary */}
        <div className="space-y-6">
          {/* Calculation Panel */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {activeTab === 'billing' ? 'Bill Summary (Deduct Stock)' : 'Invoice Summary (Quote/Estimate)'}
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">₹{(currentBill.subtotal || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentBill.discount_percentage || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        setCurrentBill(prev => ({ ...prev, discount_percentage: value }));
                      }
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Discount Amount:</span>
                <span className="font-medium text-green-600">-₹{(currentBill.discount_amount || 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">GST:</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={currentBill.tax_percentage || 3}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        setCurrentBill(prev => ({ ...prev, tax_percentage: value }));
                      }
                    }}
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <span className="text-sm">%</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tax Amount:</span>
                <span className="font-medium">₹{(currentBill.tax_amount || 0).toLocaleString()}</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-xl font-bold text-amber-600">₹{(currentBill.total_amount || 0).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={currentBill.payment_method || 'cash'}
                    onChange={(e) => setCurrentBill(prev => ({ ...prev, payment_method: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentBill.amount_paid || 0}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0) {
                        setCurrentBill(prev => ({ ...prev, amount_paid: value }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={currentBill.payment_status || 'pending'}
                    onChange={(e) => setCurrentBill(prev => ({ ...prev, payment_status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* All Bills/Invoices */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                All {activeTab === 'billing' ? 'Bills' : 'Invoices'}
              </h2>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                {activeTab === 'billing' ? recentBills.length : recentInvoices.length} {activeTab === 'billing' ? 'bills' : 'invoices'}
              </span>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {activeTab === 'billing' ? (
                recentBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{bill.bill_number}</p>
                      <p className="text-sm text-gray-600">{bill.customer_name}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-medium">₹{bill.total_amount.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          bill.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {bill.payment_status}
                        </span>
                      </div>
                      <button
                        onClick={() => generateBillPDF(bill)}
                        className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Download Bill PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-600">{invoice.customer_name}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-medium">₹{invoice.total_amount.toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invoice.payment_status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {invoice.payment_status}
                        </span>
                      </div>
                      <button
                        onClick={() => generateInvoicePDF(invoice)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Download Invoice PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
              {((activeTab === 'billing' && recentBills.length === 0) || 
                (activeTab === 'invoice' && recentInvoices.length === 0)) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No {activeTab === 'billing' ? 'bills' : 'invoices'} found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <CustomerModal
          onClose={() => setShowCustomerModal(false)}
          onSelect={setSelectedCustomer}
        />
      )}
    </div>
  );
};

export default Billing;