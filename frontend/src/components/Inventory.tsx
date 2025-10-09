import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, CreditCard as Edit, Trash2, AlertTriangle, Scan, Download, Upload } from 'lucide-react';
import Database from '../utils/database';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

const Inventory: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = ['all', t('inventory.chains'), t('inventory.rings'), t('inventory.earrings'), t('inventory.bracelets'), t('inventory.necklaces'), t('inventory.bangles')];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory]);

  const loadProducts = async () => {
    try {
      const db = Database.getInstance();
      const productData = await db.query('products') as Product[];
      setProducts(productData);
    } catch (err) {
      console.error('Error loading products:', err);
      error('Failed to load products. Please try again.');
    }
  };

  const filterProducts = () => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const db = Database.getInstance();
      const newProduct = await db.insert('products', productData);
      setProducts([...products, newProduct]);
      setShowAddModal(false);
      success('Product added successfully!');
    } catch (err) {
      console.error('Error adding product:', err);
      error('Failed to add product. Please try again.');
    }
  };

  const handleEditProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const db = Database.getInstance();
      const updatedProduct = await db.update('products', id, productData);
      if (updatedProduct) {
        setProducts(products.map(p => p.id === id ? updatedProduct : p));
        setEditingProduct(null);
        success('Product updated successfully!');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      error('Failed to update product. Please try again.');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm(t('inventory.confirmDelete'))) {
      try {
        const db = Database.getInstance();
        await db.delete('products', id);
        setProducts(products.filter(p => p.id !== id));
        success('Product deleted successfully!');
      } catch (err) {
        console.error('Error deleting product:', err);
        error('Failed to delete product. Please try again.');
      }
    }
  };

  const ProductForm: React.FC<{
    product?: Product;
    onSubmit: (data: any) => void;
    onCancel: () => void;
  }> = ({ product, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
      name: product?.name || '',
      category: product?.category || 'Chains',
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      weight: product?.weight || 0,
      purity: product?.purity || '22K',
      making_charge: product?.making_charge || 0,
      current_rate: product?.current_rate || 5500,
      stock_quantity: product?.stock_quantity || 0,
      min_stock_level: product?.min_stock_level || 1,
      status: product?.status || 'active',
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {product ? t('inventory.editProduct') : t('inventory.addNewProduct')}
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.productName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.category')} *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.sku')} *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('inventory.barcode')}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Scan className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (grams) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purity *
                </label>
                <select
                  value={formData.purity}
                  onChange={(e) => setFormData({ ...formData, purity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="24K">24K</option>
                  <option value="22K">22K</option>
                  <option value="18K">18K</option>
                  <option value="14K">14K</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Making Charge (₹) *
                </label>
                <input
                  type="number"
                  value={formData.making_charge}
                  onChange={(e) => setFormData({ ...formData, making_charge: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Rate (₹/gram) *
                </label>
                <input
                  type="number"
                  value={formData.current_rate}
                  onChange={(e) => setFormData({ ...formData, current_rate: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Stock Level *
                </label>
                <input
                  type="number"
                  value={formData.min_stock_level}
                  onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-amber-500 text-white py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors"
              >
                {product ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-gray-600 mt-1">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Download className="h-4 w-4" />
            <span>{t('common.export')}</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Upload className="h-4 w-4" />
            <span>{t('common.import')}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('inventory.addProduct')}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('inventory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? t('common.allCategories') : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('inventory.product')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('inventory.skuBarcode')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.weight')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.rate')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Stock</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.status')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.category} • {product.purity}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.sku}</p>
                      {product.barcode && (
                        <p className="text-xs text-gray-600">{product.barcode}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{product.weight}g</p>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">₹{product.current_rate}/g</p>
                      <p className="text-xs text-gray-600">{t('inventory.making')}: ₹{product.making_charge}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{product.stock_quantity}</span>
                      {product.stock_quantity <= product.min_stock_level && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      product.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t('inventory.noProductsFound')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <ProductForm
          onSubmit={handleAddProduct}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onSubmit={(data) => handleEditProduct(editingProduct.id, data)}
          onCancel={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
};

export default Inventory;