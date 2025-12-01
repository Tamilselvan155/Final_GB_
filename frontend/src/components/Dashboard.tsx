import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CreditCard,
  IndianRupee,
  Calendar,
  Receipt,
  Download,
  RefreshCw,
  Filter,
  CalendarDays,
  Clock,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Database from '../utils/database';
import { DashboardStats, Invoice, Bill, Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

interface BillStats {
  totalBills: number;
  totalInvoices: number;
  totalExchangeBills: number;
  billsValue: number;
  invoicesValue: number;
  exchangeValue: number;
}

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    total_sales: 0,
    total_products: 0,
    low_stock_alerts: 0,
    pending_payments: 0,
    today_sales: 0,
    this_month_sales: 0,
  });
  const [billStats, setBillStats] = useState<BillStats>({
    totalBills: 0,
    totalInvoices: 0,
    totalExchangeBills: 0,
    billsValue: 0,
    invoicesValue: 0,
    exchangeValue: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [exchangeBills, setExchangeBills] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [salesData, setSalesData] = useState<Array<{ month: string; sales: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'>('today');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filteredSalesData, setFilteredSalesData] = useState<Array<{ period: string; sales: number }>>([]);
  const [filteredStats, setFilteredStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageSale: 0,
  });
  const [activeTab, setActiveTab] = useState<'all' | 'invoices' | 'bills' | 'exchange'>('all');

  // Load data on component mount without toast
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Apply filter when relevant states change
  useEffect(() => {
    if (recentInvoices.length > 0 || recentBills.length > 0 || exchangeBills.length > 0) {
      applyFilter();
    }
  }, [filterType, customDateRange, recentInvoices, recentBills, exchangeBills]);

  const loadDashboardData = async () => {
    console.log('Starting loadDashboardData...');
    setIsLoading(true);
    try {
      // Reset states
      setStats({
        total_sales: 0,
        total_products: 0,
        low_stock_alerts: 0,
        pending_payments: 0,
        today_sales: 0,
        this_month_sales: 0,
      });
      setBillStats({
        totalBills: 0,
        totalInvoices: 0,
        totalExchangeBills: 0,
        billsValue: 0,
        invoicesValue: 0,
        exchangeValue: 0,
      });
      setRecentInvoices([]);
      setRecentBills([]);
      setExchangeBills([]);
      setLowStockProducts([]);
      setSalesData([]);
      setCategoryData([]);
      setFilteredSalesData([]);
      setFilteredStats({ totalSales: 0, totalTransactions: 0, averageSale: 0 });

      const db = Database.getInstance();
      console.log('Fetching data from database...');
      const [invoices, bills, products] = await Promise.all([
        db.query('invoices'),
        db.query('bills'),
        db.query('products'),
      ]);
      console.log('Data fetched:', { invoices, bills, products });

      // Validate and filter data
      const validInvoices = (invoices || []).filter((inv: any) => inv && inv.total_amount >= 0) as Invoice[];
      const validBills = (bills || []).filter((bill: any) => bill && bill.total_amount >= 0);
      const validProducts = (products || []).filter((p: any) => p && p.stock_quantity >= 0) as Product[];
      console.log('Filtered data:', { validInvoices, validBills, validProducts });

      // Combine all sales data
      const allSales = [...validInvoices, ...validBills];

      // Calculate stats
      const totalSales = allSales.reduce((sum, sale) => {
        const amount = parseFloat(sale.total_amount) || 0;
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySales = allSales
        .filter((sale) => {
          const saleDate = new Date(sale.created_at);
          return !isNaN(saleDate.getTime()) && saleDate >= todayStart;
        })
        .reduce((sum, sale) => {
          const amount = parseFloat(sale.total_amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);
      const thisMonthSales = allSales
        .filter((sale) => {
          const saleDate = new Date(sale.created_at);
          return !isNaN(saleDate.getTime()) && saleDate >= thisMonthStart;
        })
        .reduce((sum, sale) => {
          const amount = parseFloat(sale.total_amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

      const lowStock = validProducts.filter(
        (p) => p.stock_quantity <= p.min_stock_level && p.status === 'active'
      );
      const pendingPayments = allSales.filter(
        (sale) => sale.payment_status && sale.payment_status !== 'paid'
      ).length;

      setStats({
        total_sales: Math.round(totalSales * 100) / 100,
        total_products: validProducts.length,
        low_stock_alerts: lowStock.length,
        pending_payments: pendingPayments,
        today_sales: Math.round(todaySales * 100) / 100,
        this_month_sales: Math.round(thisMonthSales * 100) / 100,
      });

      // Separate invoices, bills, and exchange bills (remove slice limit)
      const recentInvoicesData = validInvoices
        .filter((inv) => inv.created_at)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const recentBillsData = validBills
        .filter((bill: Bill) => bill.created_at && !bill.bill_number?.startsWith('EXCH-'))
        .sort((a: Bill, b: Bill) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const exchangeBillsData = validBills
        .filter((bill: Bill) => bill.created_at && bill.bill_number?.startsWith('EXCH-'))
        .sort((a: Bill, b: Bill) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRecentInvoices(recentInvoicesData);
      setRecentBills(recentBillsData);
      setExchangeBills(exchangeBillsData);
      setLowStockProducts(lowStock);

      // Calculate bill statistics
      const allBills = validBills.filter((bill: Bill) => !bill.bill_number?.startsWith('EXCH-'));
      const allExchangeBills = validBills.filter((bill: Bill) => bill.bill_number?.startsWith('EXCH-'));

      const billsValue = allBills.reduce(
        (sum: number, bill: Bill) => sum + (typeof bill.total_amount === 'number' ? bill.total_amount : parseFloat(bill.total_amount) || 0),
        0
      );
      const invoicesValue = validInvoices.reduce(
        (sum: number, invoice: Invoice) => sum + (typeof invoice.total_amount === 'number' ? invoice.total_amount : parseFloat(invoice.total_amount) || 0),
        0
      );
      const exchangeValue = allExchangeBills.reduce(
        (sum: number, bill: Bill) => sum + (typeof bill.total_amount === 'number' ? bill.total_amount : parseFloat(bill.total_amount) || 0),
        0
      );

      setBillStats({
        totalBills: allBills.length,
        totalInvoices: validInvoices.length,
        totalExchangeBills: allExchangeBills.length,
        billsValue: Math.round(billsValue * 100) / 100,
        invoicesValue: Math.round(invoicesValue * 100) / 100,
        exchangeValue: Math.round(exchangeValue * 100) / 100,
      });

      // Calculate sales and category data
      calculateSalesData(allSales);
      calculateCategoryData(validProducts);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      error(t('dashboard.loadDataError'));
    } finally {
      console.log('Finished loadDashboardData');
      setIsLoading(false);
    }
  };

  const calculateSalesData = (allSales: any[]) => {
    const now = new Date();
    const salesByMonth: { [key: string]: number } = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      salesByMonth[monthKey] = 0;
    }

    // Calculate sales
    allSales.forEach((sale) => {
      if (sale && sale.created_at && sale.total_amount) {
        const saleDate = new Date(sale.created_at);
        if (!isNaN(saleDate.getTime())) {
          const monthKey = saleDate.toLocaleDateString('en-US', { month: 'short' });
          const amount = parseFloat(sale.total_amount) || 0;
          if (salesByMonth.hasOwnProperty(monthKey) && !isNaN(amount)) {
            salesByMonth[monthKey] += amount;
          }
        }
      }
    });

    const salesArray = Object.entries(salesByMonth).map(([month, sales]) => ({
      month,
      sales: Math.round(sales * 100) / 100,
    }));

    setSalesData(salesArray);
  };

  const calculateCategoryData = (products: Product[]) => {
    const categoryColors: { [key: string]: string } = {
      Chains: '#F59E0B',
      Rings: '#EAB308',
      Earrings: '#FCD34D',
      Bracelets: '#FDE68A',
      Necklaces: '#F97316',
      Bangles: '#FB923C',
      Pendants: '#F59E0B',
      Sets: '#EAB308',
      Coins: '#FCD34D',
      Other: '#6B7280',
    };

    const categoryCounts: { [key: string]: number } = {};
    products.forEach((product) => {
      if (product.status === 'active') {
        // Only use the actual product category (Chains, Rings, etc.), not Gender/Age Category
        const category = product.category;
        if (category) {
          const categoryName = category.trim();
          categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
        }
      }
    });

    const totalProducts = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);

    if (totalProducts > 0) {
      const categoryArray = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, count]) => ({
          name,
          value: Math.round((count / totalProducts) * 100),
          color: categoryColors[name] || '#6B7280',
        }));

      setCategoryData(categoryArray);
    } else {
      setCategoryData([{ name: 'No Products', value: 100, color: '#6B7280' }]);
    }
  };

  const applyFilter = () => {
    const allSales = [...recentInvoices, ...recentBills, ...exchangeBills];
    let filteredData: Array<{ period: string; sales: number }> = [];
    let totalSales = 0;
    let totalTransactions = 0;
    const now = new Date();

    // Helper function to validate and parse date
    const parseSaleDate = (createdAt: any): Date | null => {
      if (!createdAt) return null;
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) return null;
      return date;
    };

    if (filterType === 'today') {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const hoursData: { [key: string]: number } = {};
      for (let i = 0; i < 24; i++) {
        hoursData[`${i}:00`] = 0;
      }

      allSales.forEach((sale) => {
        const saleDate = parseSaleDate(sale.created_at);
        if (saleDate && saleDate >= todayStart && saleDate <= todayEnd) {
          const hour = saleDate.getHours();
          const hourKey = `${hour}:00`;
          const amount = parseFloat(sale.total_amount) || 0;
          hoursData[hourKey] += amount;
          totalSales += amount;
          totalTransactions++;
        }
      });

      filteredData = Object.entries(hoursData).map(([period, sales]) => ({
        period,
        sales: Math.round(sales * 100) / 100,
      }));
    } else if (filterType === 'week') {
      const weeksData: { [key: string]: number } = {};
      const now = new Date();

      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (now.getDay() + i * 7));
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekKey = `Week ${8 - i}`;
        weeksData[weekKey] = 0;

        allSales.forEach((sale) => {
          const saleDate = parseSaleDate(sale.created_at);
          if (saleDate && saleDate >= weekStart && saleDate <= weekEnd) {
            const amount = parseFloat(sale.total_amount) || 0;
            weeksData[weekKey] += amount;
            totalSales += amount;
            totalTransactions++;
          }
        });
      }

      filteredData = Object.entries(weeksData).map(([period, sales]) => ({
        period,
        sales: Math.round(sales * 100) / 100,
      }));
    } else if (filterType === 'month') {
      const monthsData: { [key: string]: number } = {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const monthKey = monthStart.toLocaleDateString('en-US', { month: 'short' });
        monthsData[monthKey] = 0;

        allSales.forEach((sale) => {
          const saleDate = parseSaleDate(sale.created_at);
          if (saleDate && saleDate >= monthStart && saleDate <= monthEnd) {
            const amount = parseFloat(sale.total_amount) || 0;
            monthsData[monthKey] += amount;
            totalSales += amount;
            totalTransactions++;
          }
        });
      }

      filteredData = Object.entries(monthsData).map(([period, sales]) => ({
        period,
        sales: Math.round(sales * 100) / 100,
      }));
    } else if (filterType === 'quarter') {
      const quartersData: { [key: string]: number } = {};
      
      for (let i = 3; i >= 0; i--) {
        const quarter = Math.floor((now.getMonth() - i * 3) / 3) + 1;
        const year = now.getFullYear() - Math.floor((now.getMonth() - i * 3) / 12);
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0);
        quarterEnd.setHours(23, 59, 59, 999);

        const quarterKey = `Q${quarter} ${year}`;
        quartersData[quarterKey] = 0;

        allSales.forEach((sale) => {
          const saleDate = parseSaleDate(sale.created_at);
          if (saleDate && saleDate >= quarterStart && saleDate <= quarterEnd) {
            const amount = parseFloat(sale.total_amount) || 0;
            quartersData[quarterKey] += amount;
            totalSales += amount;
            totalTransactions++;
          }
        });
      }

      filteredData = Object.entries(quartersData).map(([period, sales]) => ({
        period,
        sales: Math.round(sales * 100) / 100,
      }));
    } else if (filterType === 'year') {
      const yearsData: { [key: string]: number } = {};
      const currentYear = now.getFullYear();

      for (let i = 2; i >= 0; i--) {
        const year = currentYear - i;
        const yearStart = new Date(year, 0, 1);
        yearStart.setHours(0, 0, 0, 0);
        const yearEnd = new Date(year, 11, 31);
        yearEnd.setHours(23, 59, 59, 999);

        const yearKey = year.toString();
        yearsData[yearKey] = 0;

        allSales.forEach((sale) => {
          const saleDate = parseSaleDate(sale.created_at);
          if (saleDate && saleDate >= yearStart && saleDate <= yearEnd) {
            const amount = parseFloat(sale.total_amount) || 0;
            yearsData[yearKey] += amount;
            totalSales += amount;
            totalTransactions++;
          }
        });
      }

      filteredData = Object.entries(yearsData).map(([period, sales]) => ({
        period,
        sales: Math.round(sales * 100) / 100,
      }));
    } else if (filterType === 'custom') {
      if (customDateRange.startDate && customDateRange.endDate) {
        const startDate = new Date(customDateRange.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(customDateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        const daysData: { [key: string]: number } = {};
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
          const dayKey = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          daysData[dayKey] = 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }

        allSales.forEach((sale) => {
          const saleDate = parseSaleDate(sale.created_at);
          if (saleDate && saleDate >= startDate && saleDate <= endDate) {
            const dayKey = saleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const amount = parseFloat(sale.total_amount) || 0;
            daysData[dayKey] += amount;
            totalSales += amount;
            totalTransactions++;
          }
        });

        filteredData = Object.entries(daysData).map(([period, sales]) => ({
          period,
          sales: Math.round(sales * 100) / 100,
        }));
      }
    }

    setFilteredSalesData(filteredData);
    setFilteredStats({
      totalSales: Math.round(totalSales * 100) / 100,
      totalTransactions,
      averageSale: totalTransactions > 0 ? Math.round((totalSales / totalTransactions) * 100) / 100 : 0,
    });
  };

  const handleFilterChange = (type: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom') => {
    setFilterType(type);
    setShowFilterDropdown(false);
    if (type === 'custom') {
      setShowFilterModal(true);
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'today':
        return t('dashboard.filterToday');
      case 'week':
        return t('dashboard.filterLast8Weeks');
      case 'month':
        return t('dashboard.filterLast6Months');
      case 'quarter':
        return t('dashboard.filterLast4Quarters');
      case 'year':
        return t('dashboard.filterLast3Years');
      case 'custom':
        return customDateRange.startDate && customDateRange.endDate
          ? `${new Date(customDateRange.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(customDateRange.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : t('dashboard.filterCustomRange');
      default:
        return t('dashboard.filterSelectPeriod');
    }
  };

  const handleCustomDateApply = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      setShowFilterModal(false);
      applyFilter();
    }
  };

  const generateInvoicePDF = async (invoice: Invoice) => {
    try {
      if (!invoice) {
        error('Invalid invoice data');
        return;
      }

      // If invoice doesn't have items, fetch the full invoice with items
      let invoiceWithItems = invoice;
      if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
        try {
          const invoiceId = String(invoice.id);
          const fullInvoice = await Database.getInstance().getInvoice(invoiceId);
          if (fullInvoice) {
            invoiceWithItems = fullInvoice;
          }
        } catch (fetchError) {
          console.error('Error fetching invoice with items:', fetchError);
        }
      }

      const invoiceToUse = invoiceWithItems;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Load and add invoice background image template
      let imageDataUrl: string | null = null;
      try {
        const possiblePaths = [
          '/assets/sample-invoice.png',
          '/assets/vannaMayil-invoice.jpeg',
          '/sample-invoice.png',
          '/vannaMayil-invoice.jpeg',
          './assets/sample-invoice.png',
          'assets/sample-invoice.png'
        ];
        
        for (const imagePath of possiblePaths) {
          try {
            const response = await fetch(imagePath);
            if (response.ok) {
              const blob = await response.blob();
              imageDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (imageDataUrl) {
          const currentImageDataUrl = imageDataUrl;
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.globalAlpha = 1.0;
                  ctx.drawImage(img, 0, 0);
                  ctx.globalAlpha = 1.0;
                  
                  const imageFormat = currentImageDataUrl.includes('data:image/png') ? 'PNG' : 'JPEG';
                  const templateImageDataUrl = canvas.toDataURL(imageFormat === 'PNG' ? 'image/png' : 'image/jpeg', 1.0);
                  doc.addImage(templateImageDataUrl, imageFormat, 0, 0, pageWidth, pageHeight);
                }
              } catch (canvasError) {
                if (currentImageDataUrl) {
                  const imageFormat = currentImageDataUrl.includes('data:image/png') ? 'PNG' : 'JPEG';
                  doc.addImage(currentImageDataUrl, imageFormat, 0, 0, pageWidth, pageHeight);
                }
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = currentImageDataUrl;
          });
        }
      } catch (bgError) {
        console.warn('Could not load invoice background image:', bgError);
      }
      
      if (!imageDataUrl) {
        console.warn('WARNING: Background image not loaded! Invoice will not match template.');
      }

      // Customer information - overlay on template
      const customerInfoY = 95;
      const customerInfoX = margin + 5;
      
      // Cover grey box area with white
      doc.setFillColor(255, 255, 255);
      doc.rect(customerInfoX - 5, customerInfoY - 8, 120, 45 + 5, 'F');
      
      // Add customer information
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Customer Name & address', customerInfoX, customerInfoY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const customerName = invoiceToUse.customer_name || '';
      if (customerName) {
        doc.text(customerName, customerInfoX, customerInfoY + 13);
      }
      
      if (invoiceToUse.customer_address) {
        const addressLines = doc.splitTextToSize(invoiceToUse.customer_address, 100);
        let addressY = customerInfoY + 24;
        addressLines.forEach((line: string, idx: number) => {
          if (idx < 2) {
            doc.text(line, customerInfoX, addressY);
            addressY += 10;
          }
        });
      }
      
      if (invoiceToUse.customer_phone) {
        let phoneY = customerInfoY + 24;
        if (invoiceToUse.customer_address) {
          const addressLines = doc.splitTextToSize(invoiceToUse.customer_address, 100);
          phoneY = customerInfoY + 24 + (Math.min(addressLines.length, 2) * 10);
        }
        doc.text(`Phone: ${invoiceToUse.customer_phone}`, customerInfoX, phoneY);
      }

      // Invoice date, time, and number
      const rightInfoX = pageWidth - margin - 80;
      const invoiceDate = invoiceToUse.created_at ? new Date(invoiceToUse.created_at) : new Date();
      const dateBoxWidth = 80;
      
      // Cover grey boxes area with white
      doc.setFillColor(255, 255, 255);
      doc.rect(rightInfoX - 5, customerInfoY - 8, dateBoxWidth + 10, 40, 'F');
      
      // DATE and Time on first line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      doc.text('DATE', rightInfoX, customerInfoY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dateStr = invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const dateLabelWidth = doc.getTextWidth('DATE');
      doc.text(dateStr, rightInfoX + dateLabelWidth + 5, customerInfoY);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const timeLabelX = rightInfoX + 50;
      doc.text('Time', timeLabelX, customerInfoY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const timeStr = invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const timeLabelWidth = doc.getTextWidth('Time');
      doc.text(timeStr, timeLabelX + timeLabelWidth + 5, customerInfoY);
      
      // NO and invoice number on second line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('NO', rightInfoX, customerInfoY + 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const invNumber = invoiceToUse.invoice_number || '';
      const noLabelWidth = doc.getTextWidth('NO');
      doc.text(invNumber, rightInfoX + noLabelWidth + 5, customerInfoY + 18);

      // Products list
      const invoiceDetailsEndY = customerInfoY + 60;
      const dottedLineY = invoiceDetailsEndY + 10;
      const productsStartY = dottedLineY + 8;
      const maxProductsY = 240;
      
      let itemY = productsStartY;
      
      let itemsToProcess: any[] = [];
      if (invoiceToUse.items && Array.isArray(invoiceToUse.items) && invoiceToUse.items.length > 0) {
        itemsToProcess = invoiceToUse.items;
      } else if ((invoiceToUse as any).invoice_items && Array.isArray((invoiceToUse as any).invoice_items)) {
        itemsToProcess = (invoiceToUse as any).invoice_items;
      } else if ((invoiceToUse as any).products && Array.isArray((invoiceToUse as any).products)) {
        itemsToProcess = (invoiceToUse as any).products;
      }
      
      if (itemsToProcess && itemsToProcess.length > 0) {
        const tableStartX = margin + 10;
        const tableWidth = pageWidth - (2 * margin) - 20;
        const colWidths = {
          qty: 20,
          description: tableWidth - 20 - 30 - 40 - 40,
          weight: 30,
          rate: 40,
          total: 40
        };
        
        const colPositions = {
          qty: tableStartX,
          description: tableStartX + colWidths.qty,
          weight: tableStartX + colWidths.qty + colWidths.description,
          rate: tableStartX + colWidths.qty + colWidths.description + colWidths.weight,
          total: tableStartX + colWidths.qty + colWidths.description + colWidths.weight + colWidths.rate
        };
        
        const rowHeight = 10;
        let currentY = itemY;
        
        // Table header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        doc.text('Qty', colPositions.qty + 2, currentY);
        doc.text('Description', colPositions.description + 2, currentY);
        doc.text('Weight', colPositions.weight + 2, currentY);
        doc.text('Rate', colPositions.rate + 2, currentY);
        doc.text('Total', colPositions.total + 2, currentY);
        
        currentY += rowHeight + 5;
        
        // Table rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        let totalQty = 0;
        let totalWeight = 0;
        let grandTotal = 0;
        
        itemsToProcess.forEach((item: any) => {
          if (currentY > maxProductsY) {
            return;
          }
          
          const productName = item.product_name || item.name || item.description || 'N/A';
          const qty = parseInt(String(item.quantity || item.qty || 1));
          const rate = parseFloat(String(item.rate || item.price || 0));
          const weight = parseFloat(String(item.weight || item.gross_weight || 0));
          const total = parseFloat(String(item.total || (rate * (weight > 0 ? weight : qty))));
          
          totalQty += qty;
          totalWeight += weight;
          grandTotal += total;
          
          doc.text(String(qty), colPositions.qty + 2, currentY);
          
          const descLines = doc.splitTextToSize(productName, colWidths.description - 4);
          descLines.forEach((line: string, lineIdx: number) => {
            doc.text(line, colPositions.description + 2, currentY + (lineIdx * 7));
          });
          
          if (weight > 0) {
            doc.text(weight.toFixed(3), colPositions.weight + 2, currentY);
          } else {
            doc.text('-', colPositions.weight + 2, currentY);
          }
          
          doc.text(`₹${rate.toLocaleString('en-IN')}`, colPositions.rate + 2, currentY);
          doc.text(`₹${total.toLocaleString('en-IN')}`, colPositions.total + 2, currentY);
          
          currentY += Math.max(rowHeight, descLines.length * 7) + 2;
        });
        
        // Summary totals
        const summaryRightX = pageWidth - margin - 75;
        const summaryStartY = currentY + 20;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        doc.text(String(totalQty), summaryRightX, summaryStartY);
        doc.text(totalWeight > 0 ? totalWeight.toFixed(3) : '0.000', summaryRightX, summaryStartY + 10);
        
        const subtotal = parseFloat(String(invoiceToUse.subtotal || grandTotal));
        doc.text(`₹${subtotal.toLocaleString('en-IN')}`, summaryRightX, summaryStartY + 20);
        
        if (invoiceToUse.discount_amount && invoiceToUse.discount_amount > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          const discount = Math.round(parseFloat(invoiceToUse.discount_amount.toString()));
          doc.text(`₹${discount.toLocaleString('en-IN')}`, summaryRightX, summaryStartY + 30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
        }
        
        const totalAmount = parseFloat(String(invoiceToUse.total_amount || grandTotal));
        doc.setFontSize(12);
        doc.text(`₹${totalAmount.toLocaleString('en-IN')}`, summaryRightX, summaryStartY + 40);
      }

      // Download
      const invNum = invoiceToUse.invoice_number || 'INV-UNKNOWN';
      doc.save(`Invoice-${invNum}.pdf`);
      success('Invoice PDF downloaded successfully!');
    } catch (err) {
      console.error('Error generating invoice PDF:', err);
      error('Failed to generate invoice PDF. Please try again.');
    }
  };

  const generateBillPDF = async (bill: Bill | any) => {
    try {
      if (!bill) {
        error('Invalid bill data');
        return;
      }

      const isExchange = bill.bill_number?.startsWith('EXCH-');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Load and add invoice background image template (same template for bills)
      let imageDataUrl: string | null = null;
      try {
        const possiblePaths = [
          '/assets/sample-invoice.png',
          '/assets/vannaMayil-invoice.jpeg',
          '/sample-invoice.png',
          '/vannaMayil-invoice.jpeg',
          './assets/sample-invoice.png',
          'assets/sample-invoice.png'
        ];
        
        for (const imagePath of possiblePaths) {
          try {
            const response = await fetch(imagePath);
            if (response.ok) {
              const blob = await response.blob();
              imageDataUrl = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        if (imageDataUrl) {
          const currentImageDataUrl = imageDataUrl;
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.globalAlpha = 1.0;
                  ctx.drawImage(img, 0, 0);
                  ctx.globalAlpha = 1.0;
                  
                  const imageFormat = currentImageDataUrl.includes('data:image/png') ? 'PNG' : 'JPEG';
                  const templateImageDataUrl = canvas.toDataURL(imageFormat === 'PNG' ? 'image/png' : 'image/jpeg', 1.0);
                  doc.addImage(templateImageDataUrl, imageFormat, 0, 0, pageWidth, pageHeight);
                }
              } catch (canvasError) {
                if (currentImageDataUrl) {
                  const imageFormat = currentImageDataUrl.includes('data:image/png') ? 'PNG' : 'JPEG';
                  doc.addImage(currentImageDataUrl, imageFormat, 0, 0, pageWidth, pageHeight);
                }
              }
              resolve();
            };
            img.onerror = () => resolve();
            img.src = currentImageDataUrl;
          });
        }
      } catch (bgError) {
        console.warn('Could not load invoice background image:', bgError);
      }
      
      if (!imageDataUrl) {
        console.warn('WARNING: Background image not loaded! Bill will not match template.');
      }

      // Customer information - overlay on template
      const customerInfoY = 95;
      const customerInfoX = margin + 5;
      const customerBoxHeight = isExchange && (bill as any).old_gold_weight ? 60 : 45;
      
      // Cover grey box area with white
      doc.setFillColor(255, 255, 255);
      doc.rect(customerInfoX - 5, customerInfoY - 8, 120, customerBoxHeight + 5, 'F');
      
      // Add customer information
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Customer Name & address', customerInfoX, customerInfoY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const customerName = bill.customer_name || '';
      if (customerName) {
        doc.text(customerName, customerInfoX, customerInfoY + 13);
      }
      
      if (bill.customer_phone) {
        doc.text(`Phone: ${bill.customer_phone}`, customerInfoX, customerInfoY + 24);
      }
      
      // Add exchange details if applicable
      if (isExchange && (bill as any).old_gold_weight) {
        doc.setFont('helvetica', 'bold');
        doc.text('Old Gold:', customerInfoX, customerInfoY + 35);
        doc.setFont('helvetica', 'normal');
        doc.text(`${(bill as any).old_gold_weight}g (${(bill as any).old_gold_purity || '22K'})`, customerInfoX, customerInfoY + 45);
        if ((bill as any).exchange_difference !== undefined) {
          const diff = (bill as any).exchange_difference;
          doc.setFont('helvetica', 'bold');
          doc.text(`${diff >= 0 ? 'Pay' : 'Receive'}:`, customerInfoX, customerInfoY + 55);
          doc.setFont('helvetica', 'normal');
          doc.text(`₹${Math.abs(diff).toLocaleString()}`, customerInfoX, customerInfoY + 65);
        }
      }

      // Bill date, time, and number
      const rightInfoX = pageWidth - margin - 80;
      const billDate = bill.created_at ? new Date(bill.created_at) : new Date();
      const dateBoxWidth = 80;
      
      // Cover grey boxes area with white
      doc.setFillColor(255, 255, 255);
      doc.rect(rightInfoX - 5, customerInfoY - 8, dateBoxWidth + 10, 40, 'F');
      
      // DATE and Time on first line
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      doc.text('DATE', rightInfoX, customerInfoY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const dateLabelWidth = doc.getTextWidth('DATE');
      doc.text(dateStr, rightInfoX + dateLabelWidth + 5, customerInfoY);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const timeLabelX = rightInfoX + 50;
      doc.text('Time', timeLabelX, customerInfoY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      const timeLabelWidth = doc.getTextWidth('Time');
      doc.text(timeStr, timeLabelX + timeLabelWidth + 5, customerInfoY);
      
      // NO and bill number on second line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('NO', rightInfoX, customerInfoY + 18);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const billNumber = bill.bill_number || '';
      const noLabelWidth = doc.getTextWidth('NO');
      doc.text(billNumber, rightInfoX + noLabelWidth + 5, customerInfoY + 18);

      // Products list
      const invoiceDetailsEndY = customerInfoY + (isExchange && (bill as any).old_gold_weight ? 75 : 60);
      const dottedLineY = invoiceDetailsEndY + 10;
      const productsStartY = dottedLineY + 8;
      const maxProductsY = 240;
      
      let itemY = productsStartY;
      
      let itemsToProcess: any[] = [];
      if (bill.items && Array.isArray(bill.items) && bill.items.length > 0) {
        itemsToProcess = bill.items;
      }
      
      if (itemsToProcess && itemsToProcess.length > 0) {
        const tableStartX = margin + 10;
        const tableWidth = pageWidth - (2 * margin) - 20;
        const colWidths = {
          qty: 20,
          description: tableWidth - 20 - 30 - 40 - 40,
          weight: 30,
          rate: 40,
          total: 40
        };
        
        const colPositions = {
          qty: tableStartX,
          description: tableStartX + colWidths.qty,
          weight: tableStartX + colWidths.qty + colWidths.description,
          rate: tableStartX + colWidths.qty + colWidths.description + colWidths.weight,
          total: tableStartX + colWidths.qty + colWidths.description + colWidths.weight + colWidths.rate
        };
        
        const rowHeight = 10;
        let currentY = itemY;
        
        // Table header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        doc.text('Qty', colPositions.qty + 2, currentY);
        doc.text('Description', colPositions.description + 2, currentY);
        doc.text('Weight', colPositions.weight + 2, currentY);
        doc.text('Rate', colPositions.rate + 2, currentY);
        doc.text('Total', colPositions.total + 2, currentY);
        
        currentY += rowHeight + 5;
        
        // Table rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        
        let totalQty = 0;
        let totalWeight = 0;
        let grandTotal = 0;
        
        itemsToProcess.forEach((item: any) => {
          if (currentY > maxProductsY) {
            return;
          }
          
          const productName = item.product_name || item.name || item.description || 'N/A';
          const qty = parseInt(String(item.quantity || item.qty || 1));
          const rate = parseFloat(String(item.rate || item.price || 0));
          const weight = parseFloat(String(item.weight || item.gross_weight || 0));
          const total = parseFloat(String(item.total || (rate * (weight > 0 ? weight : qty))));
          
          totalQty += qty;
          totalWeight += weight;
          grandTotal += total;
          
          doc.text(String(qty), colPositions.qty + 2, currentY);
          
          const descLines = doc.splitTextToSize(productName, colWidths.description - 4);
          descLines.forEach((line: string, lineIdx: number) => {
            doc.text(line, colPositions.description + 2, currentY + (lineIdx * 7));
          });
          
          if (weight > 0) {
            doc.text(weight.toFixed(3), colPositions.weight + 2, currentY);
          } else {
            doc.text('-', colPositions.weight + 2, currentY);
          }
          
          doc.text(`₹${rate.toLocaleString('en-IN')}`, colPositions.rate + 2, currentY);
          doc.text(`₹${total.toLocaleString('en-IN')}`, colPositions.total + 2, currentY);
          
          currentY += Math.max(rowHeight, descLines.length * 7) + 2;
        });
        
        // Summary totals
        const summaryRightX = pageWidth - margin - 75;
        const summaryStartY = currentY + 20;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        doc.text(String(totalQty), summaryRightX, summaryStartY);
        doc.text(totalWeight > 0 ? totalWeight.toFixed(3) : '0.000', summaryRightX, summaryStartY + 10);
        
        const subtotal = parseFloat(String(bill.subtotal || grandTotal));
        doc.text(`₹${subtotal.toLocaleString('en-IN')}`, summaryRightX, summaryStartY + 20);
        
        if (bill.discount_amount && bill.discount_amount > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          const discount = Math.round(parseFloat(bill.discount_amount.toString()));
          doc.text(`₹${discount.toLocaleString('en-IN')}`, summaryRightX, summaryStartY + 30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
        }
        
        const totalAmount = parseFloat(String(bill.total_amount || grandTotal));
        doc.setFontSize(12);
        doc.text(`₹${totalAmount.toLocaleString('en-IN')}`, summaryRightX, summaryStartY + 40);
      }

      // Download
      const billNum = bill.bill_number || 'BILL-UNKNOWN';
      doc.save(`${isExchange ? 'ExchangeBill' : 'Bill'}-${billNum}.pdf`);
      success(`${isExchange ? 'Exchange Bill' : 'Bill'} PDF downloaded successfully!`);
    } catch (err) {
      console.error('Error generating bill PDF:', err);
      error('Failed to generate bill PDF. Please try again.');
    }
  };

  const generateTransactionPDF = async (transaction: Invoice | Bill | any) => {
    // Determine if it's an invoice or bill
    if (transaction.invoice_number) {
      await generateInvoicePDF(transaction as Invoice);
    } else if (transaction.bill_number) {
      await generateBillPDF(transaction as Bill);
    } else {
      error(t('dashboard.invalidTransactionData'));
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    change?: string;
  }> = ({ title, value, icon, color, change }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 overflow-hidden h-full min-h-[120px]">
      <div className="flex items-start justify-between h-full">
        <div className="flex-1 min-w-0 pr-4 overflow-hidden">
          <p className="text-gray-600 text-sm font-medium mb-2 truncate">{title}</p>
          <div className="space-y-1">
            <p
              className={`font-bold text-gray-900 break-all leading-tight ${
                typeof value === 'number' && value > 1000000 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
              }`}
            >
              {typeof value === 'number' && title.includes('Sales') ? `₹${value.toLocaleString()}` : value}
            </p>
            {change && (
              <span className="text-green-600 text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="truncate">{change}</span>
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${color} flex-shrink-0`}>{icon}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">{t('dashboard.welcomeMessage')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:gap-4 flex-shrink-0">
          {/* Filter Dropdown */}
          <div className="relative filter-dropdown-container">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center space-x-2 bg-white px-3 lg:px-4 py-2 rounded-lg shadow-sm border border-gray-300 hover:border-amber-500 hover:shadow-md transition-all duration-200 w-full sm:w-auto min-w-[180px] max-w-[250px] h-10"
            >
              <Filter className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 flex-1 text-left truncate min-w-0">
                {getFilterLabel()}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform flex-shrink-0 ${showFilterDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-2">
                  <button
                    onClick={() => handleFilterChange('today')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors ${
                      filterType === 'today' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('dashboard.filterToday')}</span>
                      {filterType === 'today' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
                    </div>
                  </button>
                  <button
                    onClick={() => handleFilterChange('week')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors ${
                      filterType === 'week' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('dashboard.filterLast8Weeks')}</span>
                      {filterType === 'week' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
                    </div>
                  </button>
                  <button
                    onClick={() => handleFilterChange('month')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors ${
                      filterType === 'month' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('dashboard.filterLast6Months')}</span>
                      {filterType === 'month' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
                    </div>
                  </button>
                  <button
                    onClick={() => handleFilterChange('quarter')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors ${
                      filterType === 'quarter' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('dashboard.filterLast4Quarters')}</span>
                      {filterType === 'quarter' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
                    </div>
                  </button>
                  <button
                    onClick={() => handleFilterChange('year')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors ${
                      filterType === 'year' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('dashboard.filterLast3Years')}</span>
                      {filterType === 'year' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
                    </div>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={() => handleFilterChange('custom')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-amber-50 transition-colors ${
                      filterType === 'custom' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{t('dashboard.filterCustomRange')}</span>
                      {filterType === 'custom' && <div className="w-2 h-2 bg-amber-500 rounded-full"></div>}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              loadDashboardData();
              success(t('dashboard.refreshSuccess'));
            }}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-3 lg:px-4 py-2 rounded-lg transition-colors h-10 ${
              isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
            title={t('dashboard.refresh')}
          >
            <RefreshCw className={`h-4 w-4 flex-shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm whitespace-nowrap hidden sm:inline">{t('dashboard.refresh')}</span>
          </button>
          <div className="flex items-center space-x-2 bg-white px-3 lg:px-4 py-2 rounded-lg shadow-sm border h-10 min-w-0">
            <Calendar className="h-4 lg:h-5 w-4 lg:w-5 text-gray-500 flex-shrink-0" />
            <span className="text-gray-700 font-medium text-xs lg:text-sm whitespace-nowrap truncate">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                // hour: '2-digit',
                // minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-0">
        <StatCard
          title={t('dashboard.todaysSales')}
          value={stats.today_sales}
          icon={<IndianRupee className="h-6 w-6 text-white" />}
          color="bg-green-500"
          change="+12%"
        />
        <StatCard
          title={t('dashboard.totalProducts')}
          value={stats.total_products}
          icon={<Package className="h-6 w-6 text-white" />}
          color="bg-blue-500"
        />
        <StatCard
          title={t('dashboard.lowStockAlerts')}
          value={stats.low_stock_alerts}
          icon={<AlertTriangle className="h-6 w-6 text-white" />}
          color="bg-red-500"
        />
        <StatCard
          title={t('dashboard.pendingPayments')}
          value={stats.pending_payments}
          icon={<CreditCard className="h-6 w-6 text-white" />}
          color="bg-yellow-500"
        />
      </div>

      {/* Filtered Sales Stats - Show when filter is applied and has data */}
      {filteredStats.totalSales > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-amber-600" />
              {t('dashboard.filteredSalesAnalysis')}
            </h3>
            <span className="text-sm text-gray-600">
              {filterType === 'today' ? t('dashboard.filterToday') : 
               filterType === 'week' ? t('dashboard.filterLast8Weeks') : 
               filterType === 'quarter' ? t('dashboard.filterLast4Quarters') :
               filterType === 'year' ? t('dashboard.filterLast3Years') :
               filterType === 'custom' ? t('dashboard.customDateRange') :
               t('dashboard.filterLast6Months')}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">₹{filteredStats.totalSales.toLocaleString()}</div>
              <div className="text-sm text-gray-600">{t('dashboard.totalSales')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">{filteredStats.totalTransactions}</div>
              <div className="text-sm text-gray-600">{t('dashboard.transactions')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-700">₹{filteredStats.averageSale.toLocaleString()}</div>
              <div className="text-sm text-gray-600">{t('dashboard.averageSale')}</div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Statistics */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('dashboard.transactionStatistics')}</h2>
          <div className="text-sm text-gray-500">{t('dashboard.allTimeSummary')}</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-blue-900">{t('dashboard.invoicesLabel')}</h3>
              <div className="p-2 bg-blue-100 rounded-full">
                <Receipt className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-700">{billStats.totalInvoices}</p>
              <p className="text-sm text-blue-600">{t('dashboard.totalInvoices')}</p>
              <p className="text-lg font-semibold text-blue-800">₹{billStats.invoicesValue.toLocaleString()}</p>
              <p className="text-xs text-blue-600">{t('dashboard.totalValue')}</p>
            </div>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-amber-900">{t('dashboard.billsLabel')}</h3>
              <div className="p-2 bg-amber-100 rounded-full">
                <Receipt className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-amber-700">{billStats.totalBills}</p>
              <p className="text-sm text-amber-600">{t('dashboard.totalBills')}</p>
              <p className="text-lg font-semibold text-amber-800">₹{billStats.billsValue.toLocaleString()}</p>
              <p className="text-xs text-amber-600">{t('dashboard.totalValue')}</p>
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-green-900">{t('dashboard.exchangeBillsLabel')}</h3>
              <div className="p-2 bg-green-100 rounded-full">
                <Receipt className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-700">{billStats.totalExchangeBills}</p>
              <p className="text-sm text-green-600">{t('dashboard.totalExchanges')}</p>
              <p className="text-lg font-semibold text-green-800">₹{billStats.exchangeValue.toLocaleString()}</p>
              <p className="text-xs text-green-600">{t('dashboard.totalValue')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.salesOverview')}</h2>
            <div className="text-sm text-gray-500">
              {filterType === 'today' ? t('dashboard.today24Hours') : 
               filterType === 'week' ? t('dashboard.filterLast8Weeks') : 
               filterType === 'month' ? t('dashboard.filterLast6Months') : 
               filterType === 'quarter' ? t('dashboard.filterLast4Quarters') :
               filterType === 'year' ? t('dashboard.filterLast3Years') :
               t('dashboard.customDateRange')}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredSalesData.length > 0 ? filteredSalesData : salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={filteredSalesData.length > 0 ? 'period' : 'month'} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales']} labelStyle={{ color: '#374151' }} />
              <Bar dataKey="sales" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.salesByCategory')}</h2>
            <div className="text-sm text-gray-500">{t('dashboard.thisMonth')}</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name} (${value}%)`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.financialActivity')}</h2>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                {activeTab === 'all'
                  ? recentInvoices.length + recentBills.length + exchangeBills.length
                  : activeTab === 'invoices'
                  ? recentInvoices.length
                  : activeTab === 'bills'
                  ? recentBills.length
                  : exchangeBills.length}{' '}
                {t('dashboard.transactionsLabel')}
              </span>
            </div>
          </div>
          <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'all' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('dashboard.all')}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'invoices' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('dashboard.invoicesLabel')} ({recentInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'bills' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('dashboard.bills')} ({recentBills.length})
            </button>
            <button
              onClick={() => setActiveTab('exchange')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'exchange' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('dashboard.exchange')} ({exchangeBills.length})
            </button>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(() => {
              let transactions: any[] = [];
              if (activeTab === 'all') {
                transactions = [...recentInvoices, ...recentBills, ...exchangeBills]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              } else if (activeTab === 'invoices') {
                transactions = recentInvoices;
              } else if (activeTab === 'bills') {
                transactions = recentBills;
              } else if (activeTab === 'exchange') {
                transactions = exchangeBills;
              }

              if (transactions.length === 0) {
                const typeLabel = activeTab === 'all' ? t('dashboard.transactionsLabel') : 
                                 activeTab === 'invoices' ? t('dashboard.invoicesLabel') :
                                 activeTab === 'bills' ? t('dashboard.bills') :
                                 t('dashboard.exchange');
                return (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('dashboard.noTransactionsFound', { type: typeLabel })}</p>
                  </div>
                );
              }

              return transactions.map((transaction, idx) => {
                const isExchange = transaction.bill_number?.startsWith('EXCH-');
                const isInvoice = transaction.invoice_number;
                // Create unique key combining transaction type and ID to avoid duplicates
                const uniqueKey = transaction.invoice_number 
                  ? `invoice-${transaction.invoice_number}-${transaction.id}` 
                  : `bill-${transaction.bill_number || transaction.id}-${idx}`;

                return (
                  <div key={uniqueKey} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <div
                        className={`p-2 rounded-full ${
                          isExchange ? 'bg-green-100' : isInvoice ? 'bg-blue-100' : 'bg-amber-100'
                        }`}
                      >
                        <Receipt
                          className={`h-4 w-4 ${
                            isExchange ? 'text-green-600' : isInvoice ? 'text-blue-600' : 'text-amber-600'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transaction.invoice_number || transaction.bill_number}</p>
                        <p className="text-sm text-gray-600">{transaction.customer_name}</p>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              isExchange ? 'bg-green-100 text-green-800' : isInvoice ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isExchange ? t('dashboard.exchangeBill') : isInvoice ? t('dashboard.invoice') : t('dashboard.bill')}
                          </span>
                          {isExchange && (transaction as any).old_gold_weight && (
                            <span className="text-xs text-gray-500">
                              {(transaction as any).old_gold_weight}g ({(transaction as any).old_gold_purity})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₹{(transaction.total_amount || 0).toLocaleString()}</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            transaction.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {transaction.payment_status}
                        </span>
                        {isExchange && (transaction as any).exchange_difference !== undefined && (
                          <p
                            className={`text-xs font-medium ${
                              (transaction as any).exchange_difference >= 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {(transaction as any).exchange_difference >= 0 ? t('dashboard.pay') : t('dashboard.receive')} ₹{Math.abs((transaction as any).exchange_difference).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => generateTransactionPDF(transaction)}
                        className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                        title={t('dashboard.downloadPDF')}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.lowStockAlertsTitle')}</h2>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {lowStockProducts.length} {t('dashboard.items')}
            </span>
          </div>
          <div className="space-y-4">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-red-600">{product.stock_quantity} {t('dashboard.left')}</p>
                  <p className="text-xs text-gray-600">{t('dashboard.min')}: {product.min_stock_level}</p>
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>{t('dashboard.allProductsWellStocked')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Date Range Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-amber-600" />
                  {t('dashboard.customDateRange')}
              </h3>
                <button 
                  onClick={() => setShowFilterModal(false)} 
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
                >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
              <p className="text-sm text-gray-500 mt-2">{t('dashboard.selectDateRangeDescription')}</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('dashboard.quickPresets')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: t('dashboard.last7Days'), days: 7 },
                    { label: t('dashboard.last30Days'), days: 30 },
                    { label: t('dashboard.last90Days'), days: 90 },
                    { label: t('dashboard.last6MonthsPreset'), days: 180 },
                    { label: t('dashboard.thisMonth'), days: 'thisMonth' },
                    { label: t('dashboard.lastMonth'), days: 'lastMonth' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const endDate = new Date();
                        endDate.setHours(23, 59, 59, 999);
                        let startDate = new Date();
                        
                        if (preset.days === 'thisMonth') {
                          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                        } else if (preset.days === 'lastMonth') {
                          startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
                          endDate.setDate(0); // Last day of previous month
                          endDate.setHours(23, 59, 59, 999);
                        } else if (typeof preset.days === 'number') {
                          startDate.setDate(endDate.getDate() - preset.days);
                          startDate.setHours(0, 0, 0, 0);
                        }
                        
                        setCustomDateRange({
                          startDate: startDate.toISOString().split('T')[0],
                          endDate: endDate.toISOString().split('T')[0],
                        });
                      }}
                      className="px-4 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 border border-gray-200 rounded-lg transition-all duration-200 text-left"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs */}
              <div className="border-t pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('dashboard.orSelectCustomRange')}</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('dashboard.startDate')}</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                        max={customDateRange.endDate || new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
                    </div>
              </div>
              <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('dashboard.endDate')}</label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                        min={customDateRange.startDate}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>
                  </div>
                </div>
                {customDateRange.startDate && customDateRange.endDate && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700">
                      <span className="font-medium">{t('dashboard.selectedRange')}:</span>{' '}
                      {new Date(customDateRange.startDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}{' '}
                      {t('dashboard.to')}{' '}
                      {new Date(customDateRange.endDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowFilterModal(false);
                    setCustomDateRange({ startDate: '', endDate: '' });
                  }}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCustomDateApply}
                  disabled={!customDateRange.startDate || !customDateRange.endDate}
                  className={`flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium ${
                    !customDateRange.startDate || !customDateRange.endDate
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                  }`}
                >
                  {t('dashboard.applyFilter')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;