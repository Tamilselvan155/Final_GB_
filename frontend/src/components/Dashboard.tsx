import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CreditCard,
  IndianRupee,
  Calendar,
  Receipt
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Database from '../utils/database';
import { DashboardStats, Invoice, Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats>({
    total_sales: 0,
    total_products: 0,
    low_stock_alerts: 0,
    pending_payments: 0,
    today_sales: 0,
    this_month_sales: 0,
  });

  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    const db = Database.getInstance();
    
    // Load invoices and products
    const invoices = await db.query('invoices') as Invoice[];
    const products = await db.query('products') as Product[];
    
    // Calculate stats
    const totalSales = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySales = invoices
      .filter(inv => new Date(inv.created_at) >= todayStart)
      .reduce((sum, inv) => sum + inv.total_amount, 0);
    
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonthSales = invoices
      .filter(inv => new Date(inv.created_at) >= thisMonthStart)
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_level);
    const pendingPayments = invoices.filter(inv => inv.payment_status !== 'paid').length;

    setStats({
      total_sales: totalSales,
      total_products: products.length,
      low_stock_alerts: lowStock.length,
      pending_payments: pendingPayments,
      today_sales: todaySales,
      this_month_sales: thisMonthSales,
    });

    setRecentInvoices(invoices.slice(-5).reverse());
    setLowStockProducts(lowStock);
  };

  const salesData = [
    { month: 'Jan', sales: 45000 },
    { month: 'Feb', sales: 52000 },
    { month: 'Mar', sales: 48000 },
    { month: 'Apr', sales: 61000 },
    { month: 'May', sales: 55000 },
    { month: 'Jun', sales: 67000 },
  ];

  const categoryData = [
    { name: 'Chains', value: 45, color: '#F59E0B' },
    { name: 'Rings', value: 30, color: '#EAB308' },
    { name: 'Earrings', value: 20, color: '#FCD34D' },
    { name: 'Bracelets', value: 5, color: '#FDE68A' },
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    change?: string;
  }> = ({ title, value, icon, color, change }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <div className="flex items-center space-x-2">
            <p className="text-2xl font-bold text-gray-900">
              {typeof value === 'number' && title.includes('Sales') 
                ? `₹${value.toLocaleString()}` 
                : value}
            </p>
            {change && (
              <span className="text-green-600 text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                {change}
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('dashboard.welcomeMessage')}</p>
        </div>
        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
          <Calendar className="h-5 w-5 text-gray-500" />
          <span className="text-gray-700 font-medium">
            {new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.salesOverview')}</h2>
            <div className="text-sm text-gray-500">{t('dashboard.last6Months')}</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                formatter={(value) => [`₹${value.toLocaleString()}`, 'Sales']}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="sales" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution */}
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
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('dashboard.recentInvoices')}</h2>
            <button className="text-amber-600 hover:text-amber-700 font-medium text-sm">
              {t('common.viewAll')}
            </button>
          </div>
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <Receipt className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">{invoice.customer_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">₹{invoice.total_amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    invoice.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
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
    </div>
  );
};

export default Dashboard;