import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Package, Plus, Search, CreditCard, Trash2, AlertTriangle, Scan, Info, Scale, Barcode, User, Hash, Sparkles, Clock, Wrench, X, RotateCcw, FolderPlus, Trash, ChevronDown, AlertCircle } from 'lucide-react';
import Database from '../utils/database';
import { Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  availableCategories?: string[];
  onCategoryAdded?: (category: string) => void;
  onCategoryDeleted?: (category: string) => void;
  products?: Product[];
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, onCancel, availableCategories = [], onCategoryAdded, onCategoryDeleted, products = [] }) => {
  const { success, error } = useToast();
  const { t } = useLanguage();

  const [formData, setFormData] = useState<Omit<Product, 'id' | 'created_at' | 'updated_at'>>({
    name: product?.name || '',
    category: product?.category || 'Chains',
    product_category: product?.product_category || undefined,
    material_type: product?.material_type || 'Gold',
    sku: product?.sku || '',
    huid: product?.huid || '',
    barcode: product?.barcode || '',
    weight: product?.weight || 0,
    purity: product?.purity || '22K',
    making_charge: 0, // Will be set in billing module
    current_rate: 0, // Will be set in billing module
    stock_quantity: product?.stock_quantity || 0,
    min_stock_level: product?.min_stock_level || 1,
    status: product?.status || 'active',
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    sku?: string;
    huid?: string;
    weight?: string;
    stock_quantity?: string;
    min_stock_level?: string;
    barcode?: string;
    purity?: string;
    material_type?: string;
    status?: string;
  }>({});

  // Get purity options based on material type
  const getPurityOptions = (materialType: string): string[] => {
    switch (materialType) {
      case 'Gold':
        return ['24K', '22K', '18K', '14K'];
      case 'Silver':
        return ['999', '925', '900', '875'];
      case 'Platinum':
        return ['950', '900', '850'];
      case 'Diamond':
        return ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
      default:
        return ['24K', '22K', '18K', '14K', '999', '925', 'Other'];
    }
  };

  // Update purity when material type changes
  useEffect(() => {
    const purityOptions = getPurityOptions(formData.material_type || 'Gold');
    // If current purity is not in the new options, reset to first option
    if (!purityOptions.includes(formData.purity || '')) {
      setFormData(prev => ({
        ...prev,
        purity: purityOptions[0] || '22K'
      }));
    }
  }, [formData.material_type]);

  const validateBarcode = (barcode: string): boolean => {
    if (!barcode || barcode.length < 3) return false;
    const barcodeRegex = /^[A-Za-z0-9\-_]+$/;
    return barcodeRegex.test(barcode);
  };

  const handleBarcodeInput = (value: string) => {
    setFormData({ ...formData, barcode: value });

    if (barcodeTimeoutRef.current) {
      clearTimeout(barcodeTimeoutRef.current);
    }

    barcodeTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        processBarcode(value.trim());
      }
    }, 100);
  };

  const processBarcode = (barcode: string) => {
    if (!validateBarcode(barcode)) {
      error(t('inventory.invalidBarcode'));
      return;
    }

    setIsScanning(true);

    setTimeout(() => {
      setFormData(prev => ({ ...prev, barcode }));
      success(t('inventory.barcodeScanSuccess'));
      setIsScanning(false);
    }, 300);
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && formData.barcode && formData.barcode.trim()) {
      e.preventDefault();
      processBarcode(formData.barcode.trim());
    }
  };

  const handleScanClick = () => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-6);
    const productCode = formData.name.replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
    const generatedBarcode = `${productCode}${timestamp}`;
    setFormData(prev => ({ ...prev, barcode: generatedBarcode }));
    success(t('inventory.barcodeGenerateSuccess'));
  };

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      sku?: string;
      huid?: string;
      weight?: string;
      stock_quantity?: string;
      min_stock_level?: string;
      barcode?: string;
      purity?: string;
      material_type?: string;
      status?: string;
    } = {};

    // Name validation
    if (!formData.name.trim()) {
      errors.name = t('inventory.productNameRequired');
    } else if (formData.name.trim().length < 2) {
      errors.name = t('inventory.productNameMinLength');
    }

    // SKU validation
    if (!formData.sku.trim()) {
      errors.sku = t('inventory.skuRequired');
    } else if (formData.sku.trim().length < 2) {
      errors.sku = t('inventory.skuMinLength');
    }

    // HUID validation
    if (!formData.huid || !formData.huid.trim()) {
      errors.huid = t('inventory.huidRequired');
    } else if (formData.huid.trim().length < 3) {
      errors.huid = t('inventory.huidMinLength');
    }

    // Weight validation
    if (!formData.weight || formData.weight <= 0) {
      errors.weight = t('inventory.weightRequired');
    } else if (formData.weight > 10000) {
      errors.weight = t('inventory.weightMaxValue');
    }

    // Material Type validation
    if (!formData.material_type || formData.material_type.trim() === '') {
      errors.material_type = t('inventory.materialTypeRequired');
    }

    // Purity validation
    if (!formData.purity || formData.purity.trim() === '') {
      errors.purity = t('inventory.purityRequired');
    }

    // Stock quantity validation
    if (formData.stock_quantity < 0) {
      errors.stock_quantity = t('inventory.stockQuantityRequired');
    } else if (formData.stock_quantity > 1000000) {
      errors.stock_quantity = t('inventory.stockQuantityMaxValue');
    }

    // Min stock level validation
    if (formData.min_stock_level === undefined || formData.min_stock_level < 0) {
      errors.min_stock_level = t('inventory.minStockLevelRequired');
    } else if (formData.min_stock_level > 100000) {
      errors.min_stock_level = t('inventory.minStockLevelMaxValue');
    }

    // Status validation
    if (!formData.status || formData.status.trim() === '') {
      errors.status = t('inventory.statusRequired');
    }

    // Barcode validation (now required)
    if (!formData.barcode || !formData.barcode.trim()) {
      errors.barcode = t('inventory.barcodeRequired');
    } else if (!validateBarcode(formData.barcode.trim())) {
      errors.barcode = t('inventory.barcodeInvalid');
    } else {
      // Check for duplicate barcode (exclude current product if editing)
      const trimmedBarcode = formData.barcode.trim();
      const duplicateProduct = products.find(
        p => p.barcode === trimmedBarcode && (!product || p.id !== product.id)
      );
      if (duplicateProduct) {
        errors.barcode = t('inventory.barcodeAlreadyExists', { barcode: trimmedBarcode });
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }
    onSubmit(formData);
  };

  const handleWheel = (event: React.WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur();
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      error(t('inventory.categoryNameRequired'));
      return;
    }

    const trimmedCategory = newCategoryName.trim();
    
    // Check if category already exists
    const allCategories = ['Chains', 'Rings', 'Earrings', 'Bracelets', 'Necklaces', 'Bangles', ...availableCategories];
    if (allCategories.some(cat => cat.toLowerCase() === trimmedCategory.toLowerCase())) {
      error(t('inventory.categoryAlreadyExists'));
      return;
    }

    // Add the new category
    if (onCategoryAdded) {
      onCategoryAdded(trimmedCategory);
    }
    
    // Set the new category as selected
    setFormData({ ...formData, category: trimmedCategory });
    setNewCategoryName('');
    success(t('inventory.categoryAddedSuccess'));
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-4 py-3 border-b border-amber-200/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-amber-500 rounded-lg shadow-md">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {product ? t('inventory.editProduct') : t('inventory.addNewProduct')}
                </h2>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
              title={t('inventory.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-3 space-y-3 overflow-y-auto flex-grow bg-gray-50/30">
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('inventory.productName')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) {
                      setFormErrors({ ...formErrors, name: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('common.category')} *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(!showCategoryModal)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                    title={t('inventory.manageCategories')}
                  >
                    <FolderPlus className="h-3 w-3" />
                    <span>{showCategoryModal ? t('common.close') : t('inventory.manageCategories')}</span>
                  </button>
                </div>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {['Chains', 'Rings', 'Earrings', 'Bracelets', 'Necklaces', 'Bangles', ...availableCategories].map(category => {
                    const translationKey = `inventory.${category.toLowerCase()}`;
                    const translatedName = t(translationKey);
                    const displayName = translatedName !== translationKey ? translatedName : category;
                    return (
                      <option key={category} value={category}>{displayName}</option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
          
          {/* Inline Category Manager - Full Width */}
          {showCategoryModal && (
            <div className="col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              {/* Add New Category */}
            <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  {t('inventory.addNewCategory')}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory();
                      } else if (e.key === 'Escape') {
                        setShowCategoryModal(false);
                        setNewCategoryName('');
                      }
                    }}
                    placeholder={t('inventory.categoryNamePlaceholder')}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('common.add')}</span>
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1.5">{t('inventory.categoryNameHint')}</p>
              </div>
              
              {/* Custom Categories List */}
              {availableCategories.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {t('inventory.customCategories')}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableCategories.map((category) => {
                      const translationKey = `inventory.${category.toLowerCase()}`;
                      const translatedName = t(translationKey);
                      const displayName = translatedName !== translationKey ? translatedName : category;
                      const isInUse = products.some(p => p.category === category);
                      
                      return (
                        <div
                          key={category}
                          className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-900">{displayName}</span>
                          <div className="flex items-center space-x-2">
                            {isInUse && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded font-medium">
                                {t('inventory.inUse')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (onCategoryDeleted) {
                                  onCategoryDeleted(category);
                                }
                              }}
                              disabled={isInUse}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isInUse
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                              }`}
                              title={isInUse ? t('inventory.cannotDeleteInUse') : t('inventory.deleteCategory')}
                            >
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {availableCategories.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-xs">{t('inventory.noCustomCategoriesYet')}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Identification Section */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('inventory.genderAgeCategory')}
                </label>
                <select
                  value={formData.product_category || ''}
                  onChange={(e) => setFormData({ ...formData, product_category: (e.target.value as 'Men' | 'Women' | 'Kids') || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">{t('inventory.selectGenderAgeCategory')}</option>
                  {['Men', 'Women', 'Kids'].map(category => (
                    <option key={category} value={category}>{t(`inventory.${category.toLowerCase()}`)}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('inventory.sku')} *
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => {
                    setFormData({ ...formData, sku: e.target.value });
                    if (formErrors.sku) {
                      setFormErrors({ ...formErrors, sku: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.sku ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.sku && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.sku}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('inventory.huid')} *
                </label>
                <input
                  type="text"
                  value={formData.huid || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, huid: e.target.value });
                    if (formErrors.huid) {
                      setFormErrors({ ...formErrors, huid: undefined });
                    }
                  }}
                  placeholder={t('inventory.huidPlaceholder')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.huid ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.huid && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.huid}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.barcode')} *</label>
                <div className="flex space-x-2 items-start">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => {
                          handleBarcodeInput(e.target.value);
                          if (formErrors.barcode) {
                            setFormErrors({ ...formErrors, barcode: undefined });
                          }
                        }}
                        onKeyDown={handleBarcodeKeyDown}
                        placeholder={t('inventory.barcodePlaceholder')}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 font-monowarden-blockquotesono text-sm ${
                          formErrors.barcode ? 'border-red-500' : 'border-gray-300'
                        }`}
                        disabled={isScanning}
                        title={t('inventory.barcodeInputTitle')}
                        required
                      />
                      {isScanning && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                        </div>
                      )}
                    </div>
                    {formErrors.barcode && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.barcode}</p>
                    )}
                    {isScanning && !formErrors.barcode && (
                      <div className="text-xs text-amber-600 mt-1 flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border border-amber-500 border-t-transparent mr-2"></div>
                        {t('inventory.barcodeScanning')}
                      </div>
                    )}
                    {formData.barcode && !isScanning && !formErrors.barcode && (
                      <div className="text-xs text-green-600 mt-1 flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        {t('inventory.barcodeReady')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleScanClick}
                      disabled={isScanning}
                      className={`px-3 py-2 rounded-lg transition-colors ${isScanning ? 'bg-amber-100 text-amber-600 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      title={t('inventory.focusBarcodeInput')}
                    >
                      <Scan className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={generateBarcode}
                      disabled={isScanning || !formData.name.trim()}
                      className={`px-3 py-2 rounded-lg transition-colors ${isScanning || !formData.name.trim() ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      title={t('inventory.generateBarcodeHint')}
                    >
                      <Package className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Physical Properties Section */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.weightGrams')} *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  value={formData.weight || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, weight: value });
                    if (formErrors.weight) {
                      setFormErrors({ ...formErrors, weight: undefined });
                    }
                  }}
                  onWheel={handleWheel}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.weight ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.weight && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.weight}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.materialType')} *</label>
                <select
                  value={formData.material_type || 'Gold'}
                  onChange={(e) => {
                    const newMaterialType = e.target.value as 'Gold' | 'Silver' | 'Platinum' | 'Diamond' | 'Other';
                    const purityOptions = getPurityOptions(newMaterialType);
                    setFormData({ 
                      ...formData, 
                      material_type: newMaterialType,
                      // Reset purity to first option of new material type if current purity is not valid
                      purity: purityOptions.includes(formData.purity || '') ? formData.purity : purityOptions[0] || '22K'
                    });
                    if (formErrors.material_type) {
                      setFormErrors({ ...formErrors, material_type: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.material_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="Gold">{t('inventory.gold')}</option>
                  <option value="Silver">{t('inventory.silver')}</option>
                  <option value="Platinum">{t('inventory.platinum')}</option>
                  <option value="Diamond">{t('inventory.diamond')}</option>
                  <option value="Other">{t('inventory.other')}</option>
                </select>
                {formErrors.material_type && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.material_type}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.purity')} *</label>
                <select
                  value={formData.purity}
                  onChange={(e) => {
                    const newPurity = e.target.value;
                    setFormData({ 
                      ...formData, 
                      purity: newPurity
                    });
                    if (formErrors.purity) {
                      setFormErrors({ ...formErrors, purity: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.purity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                >
                  {getPurityOptions(formData.material_type || 'Gold').map((purity) => (
                    <option key={purity} value={purity}>
                      {purity}
                    </option>
                  ))}
                </select>
                {formErrors.purity && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.purity}</p>
                )}
              </div>
            </div>
          </div>

          {/* Inventory Management Section */}
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.stockQuantity')} *</label>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  value={formData.stock_quantity !== undefined && formData.stock_quantity !== null ? formData.stock_quantity : ''}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const value = inputValue === '' ? 0 : parseInt(inputValue) || 0;
                    setFormData({ ...formData, stock_quantity: value });
                    if (formErrors.stock_quantity) {
                      setFormErrors({ ...formErrors, stock_quantity: undefined });
                    }
                  }}
                  onWheel={handleWheel}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.stock_quantity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.stock_quantity && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.stock_quantity}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.minStockLevel')} *</label>
                <input
                  type="number"
                  min="0"
                  max="100000"
                  value={formData.min_stock_level || ''}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, min_stock_level: value });
                    if (formErrors.min_stock_level) {
                      setFormErrors({ ...formErrors, min_stock_level: undefined });
                    }
                  }}
                  onWheel={handleWheel}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.min_stock_level ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.min_stock_level && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.min_stock_level}</p>
                )}
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('inventory.status')} *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => {
                    setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' });
                    if (formErrors.status) {
                      setFormErrors({ ...formErrors, status: undefined });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                    formErrors.status ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="active">{t('common.active')}</option>
                  <option value="inactive">{t('common.inactive')}</option>
                </select>
                {formErrors.status && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-amber-500 text-white py-2.5 px-4 rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-sm"
            >
              {product ? t('inventory.updateProduct') : t('inventory.addProduct')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Inventory: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);
  const [genderDropdownOpen, setGenderDropdownOpen] = useState<boolean>(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const genderDropdownRef = useRef<HTMLDivElement>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [cascadeDeleteInfo, setCascadeDeleteInfo] = useState<{ product: Product; message: string } | null>(null);

  // Build categories list including custom categories
  const baseCategories = ['Chains', 'Rings', 'Earrings', 'Bracelets', 'Necklaces', 'Bangles'];
  const allCategories = [...baseCategories, ...customCategories];
  const productCategories: string[] = ['all', 'Men', 'Women', 'Kids'];
  const productCategoryLabels: { [key: string]: string } = {
    'all': t('inventory.allGenderAge'),
    'Men': t('inventory.men'),
    'Women': t('inventory.women'),
    'Kids': t('inventory.kids')
  };

  useEffect(() => {
    loadProducts();
    loadCustomCategories();
  }, []);

  const loadCustomCategories = () => {
    // Load custom categories from localStorage
    const stored = localStorage.getItem('customCategories');
    if (stored) {
      try {
        const categories = JSON.parse(stored);
        setCustomCategories(categories);
      } catch (err) {
        console.error('Error loading custom categories:', err);
      }
    }
  };

  const saveCustomCategories = (categories: string[]) => {
    // Save custom categories to localStorage
    localStorage.setItem('customCategories', JSON.stringify(categories));
    setCustomCategories(categories);
  };

  const handleCategoryAdded = (category: string) => {
    // Add the new category to the list if it doesn't exist
    if (!customCategories.includes(category)) {
      const updated = [...customCategories, category];
      saveCustomCategories(updated);
    }
  };

  const handleCategoryDeleted = (category: string) => {
    // Check if category is in use
    const isInUse = products.some(p => p.category === category);
    
    if (isInUse) {
      error(t('inventory.cannotDeleteInUse'));
      return;
    }

    // Open confirmation modal instead of browser confirm
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    
    const category = categoryToDelete;
      const updated = customCategories.filter(cat => cat !== category);
      saveCustomCategories(updated);
      success(t('inventory.categoryDeletedSuccess'));
      
      // If the deleted category was selected, reset to default
      if (selectedCategory === category) {
        setSelectedCategory('all');
      }
    
    setCategoryToDelete(null);
  };

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, selectedCategory, selectedProductCategory]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (genderDropdownRef.current && !genderDropdownRef.current.contains(event.target as Node)) {
        setGenderDropdownOpen(false);
      }
    };

    if (categoryDropdownOpen || genderDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [categoryDropdownOpen, genderDropdownOpen]);

  // Close dropdowns on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCategoryDropdownOpen(false);
        setGenderDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const loadProducts = async () => {
    try {
      const db = Database.getInstance();
      const productData = await db.query('products') as Product[];
      // Sort by created_at descending (newest first)
      const sortedProducts = productData.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
      setProducts(sortedProducts);
    } catch (err: unknown) {
      console.error('Error loading products:', err);
      error(t('inventory.loadError'));
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.huid && product.huid.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (selectedProductCategory !== 'all') {
      filtered = filtered.filter(product => product.product_category === selectedProductCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const db = Database.getInstance();
      const newProduct = await db.insert('products', productData);
      // Add new product at the top of the list (newest first)
      setProducts([newProduct, ...products]);
      setShowAddModal(false);
      success(t('inventory.productAddSuccess'));
    } catch (err: any) {
      console.error('Error adding product:', err);
      // Extract backend error message
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      // Check if error is about duplicate barcode
      if (backendMessage.toLowerCase().includes('barcode') || backendMessage.toLowerCase().includes('unique')) {
        error(t('inventory.barcodeAlreadyExists', { barcode: productData.barcode }));
      } else if (backendMessage) {
        // Show backend error message if available
        error(backendMessage);
      } else {
        error(t('inventory.productAddError'));
      }
    }
  };

  const handleEditProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const db = Database.getInstance();
      const updatedProduct = await db.update('products', id, productData);
      if (updatedProduct) {
        // Update product while maintaining newest-first order
        const updatedProducts = products.map(p => p.id === id ? updatedProduct : p);
        // Re-sort to maintain newest-first order (in case updated_at changed)
        const sortedProducts = updatedProducts.sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA; // Descending order (newest first)
        });
        setProducts(sortedProducts);
        setEditingProduct(null);
        success(t('inventory.productUpdateSuccess'));
      }
    } catch (err: any) {
      console.error('Error updating product:', err);
      // Extract backend error message
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      // Check if error is about duplicate barcode
      if (backendMessage.toLowerCase().includes('barcode') || backendMessage.toLowerCase().includes('unique')) {
        error(t('inventory.barcodeAlreadyExists', { barcode: productData.barcode }));
      } else if (backendMessage) {
        // Show backend error message if available
        error(backendMessage);
      } else {
        error(t('inventory.productUpdateError'));
      }
    }
  };

  const handleDeleteProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    // Open confirmation modal instead of browser confirm
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

      try {
        const db = Database.getInstance();
      await db.delete('products', productToDelete.id);
      setProducts(products.filter(p => p.id !== productToDelete.id));
        success(t('inventory.productDeleteSuccess'));
      setProductToDelete(null);
      } catch (err: any) {
        console.error('Error deleting product:', err);
        if (err.response?.status === 400 && err.response?.data?.references) {
          const references = err.response.data.references;
          const message = t('inventory.deleteReferencesMessage', {
            bills: references.bills,
            invoices: references.invoices
          });
        // Open cascade confirmation modal
        setCascadeDeleteInfo({ product: productToDelete, message });
        setProductToDelete(null);
      } else {
        // Extract backend error message
        const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
        if (backendMessage) {
          error(backendMessage);
        } else {
          error(t('inventory.productDeleteError'));
        }
        setProductToDelete(null);
      }
    }
  };

  const confirmCascadeDeleteProduct = async () => {
    if (!cascadeDeleteInfo) return;
    const { product } = cascadeDeleteInfo;

            try {
              const dbInstance = Database.getInstance();
      await dbInstance.deleteWithCascade('products', product.id);
      setProducts(products.filter(p => p.id !== product.id));
              success(t('inventory.productDeleteCascadeSuccess'));
            } catch (cascadeErr: any) {
              console.error('Error in cascade delete:', cascadeErr);
              // Extract backend error message
              const backendMessage = cascadeErr?.response?.data?.message || cascadeErr?.response?.data?.error || cascadeErr?.message || '';
              if (backendMessage) {
                error(backendMessage);
              } else {
                error(t('inventory.productDeleteCascadeError'));
              }
    } finally {
      setCascadeDeleteInfo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('inventory.title')}</h1>
          <p className="text-gray-600 mt-1">{t('inventory.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            title={t('inventory.addNewProductTooltip')}
          >
            <Plus className="h-4 w-4" />
            <span>{t('inventory.addProduct')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('inventory.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="relative" ref={categoryDropdownRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              {t('common.category')}
            </label>
            <button
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen);
                setGenderDropdownOpen(false);
              }}
              className="w-52 flex items-center justify-between px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 hover:border-amber-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              <span className="truncate">
                {selectedCategory === 'all' 
                  ? t('common.allCategories')
                  : (() => {
                      const translationKey = `inventory.${selectedCategory.toLowerCase()}`;
                      const translated = t(translationKey);
                      return translated !== translationKey ? translated : selectedCategory;
                    })()
                }
              </span>
              <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
              
              {categoryDropdownOpen && (
                <div className="absolute z-50 mt-1 w-52 bg-white rounded-lg shadow-soft-lg border border-amber-200/20 py-2 animate-scale-in backdrop-blur-md max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-2.5 text-left transition-all duration-200 ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 font-medium border-r-4 border-amber-500'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700'
                    }`}
                  >
                    <span className="text-sm">{t('common.allCategories')}</span>
                    {selectedCategory === 'all' && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-amber-500"></div>
                    )}
                  </button>
                {allCategories.map(category => {
                  const translationKey = `inventory.${category.toLowerCase()}`;
                  const translated = t(translationKey);
                  const displayName = translated !== translationKey ? translated : category;
                  return (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-2.5 text-left transition-all duration-200 ${
                          selectedCategory === category
                            ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 font-medium border-r-4 border-amber-500'
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700'
                        }`}
                      >
                        <span className="text-sm truncate">{displayName}</span>
                        {selectedCategory === category && (
                          <div className="ml-auto h-2 w-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                        )}
                      </button>
                  );
                })}
            </div>
              )}
          </div>
          <div className="relative" ref={genderDropdownRef}>
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
              {t('inventory.genderAgeCategory')}
            </label>
            <button
              onClick={() => {
                setGenderDropdownOpen(!genderDropdownOpen);
                setCategoryDropdownOpen(false);
              }}
              className="w-48 flex items-center justify-between px-4 py-2.5 border-2 border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 hover:border-amber-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
              >
              <span className="truncate">
                {selectedProductCategory === 'all' 
                  ? t('inventory.allGenderAge')
                  : productCategoryLabels[selectedProductCategory] || selectedProductCategory
                }
              </span>
              <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 flex-shrink-0 ${genderDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {genderDropdownOpen && (
              <div className="absolute z-50 mt-1 w-48 bg-white rounded-lg shadow-soft-lg border border-amber-200/20 py-2 animate-scale-in backdrop-blur-md">
                {productCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedProductCategory(category);
                      setGenderDropdownOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-2.5 text-left transition-all duration-200 ${
                      selectedProductCategory === category
                        ? 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 font-medium border-r-4 border-amber-500'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 hover:text-amber-700'
                    }`}
                  >
                    <span className="text-sm truncate">
                    {category === 'all' ? t('inventory.allGenderAge') : productCategoryLabels[category] || category}
                    </span>
                    {selectedProductCategory === category && (
                      <div className="ml-auto h-2 w-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                    )}
                  </button>
                ))}
              </div>
            )}
            </div>
            {(searchTerm || selectedCategory !== 'all' || selectedProductCategory !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                  setSelectedProductCategory('all');
                setCategoryDropdownOpen(false);
                setGenderDropdownOpen(false);
                }}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title={t('inventory.resetFiltersTooltip')}
              >
                <RotateCcw className="h-4 w-4" />
                <span>{t('inventory.resetFilters')}</span>
              </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('inventory.product')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('inventory.skuBarcode')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('inventory.genderAge')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.weight')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('inventory.stock')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.status')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-[#4A90E2]" />
                      <div>
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-600">
                          {product.category} • {product.material_type ? t(`inventory.${product.material_type.toLowerCase()}`) : t('inventory.gold')} • {product.purity}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-[#3B82F6]" />
                        <p className="text-sm font-medium text-gray-900">{product.sku}</p>
                      </div>
                      {product.huid && (
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-[#8B5CF6]" />
                          <p className="text-xs text-gray-600">HUID: {product.huid}</p>
                        </div>
                      )}
                      {product.barcode && (
                        <div className="flex items-center space-x-2">
                          <Barcode className="h-4 w-4 text-[#10B981]" />
                          <p className="text-xs text-gray-600">{product.barcode}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-[#F59E0B]" />
                      {product.product_category ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.product_category === 'Men' ? 'bg-blue-100 text-blue-800' :
                            product.product_category === 'Women' ? 'bg-pink-100 text-pink-800' :
                              'bg-green-100 text-green-800'
                          }`}>
                          {productCategoryLabels[product.product_category] || product.product_category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">{t('inventory.notSet')}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Scale className="h-4 w-4 text-[#2E7D32]" />
                      <p className="text-sm text-gray-900">{product.weight}g</p>
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
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {t(`common.${product.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                        title={t('inventory.editProductTooltip')}
                      >
                        <CreditCard className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title={t('inventory.deleteProductTooltip')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewingProduct(product)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title={t('inventory.viewProductDetailsTooltip')}
                      >
                        <Info className="h-4 w-4" />
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

      {showAddModal && (
        <ProductForm
          onSubmit={handleAddProduct}
          onCancel={() => setShowAddModal(false)}
          availableCategories={customCategories}
          onCategoryAdded={handleCategoryAdded}
          onCategoryDeleted={handleCategoryDeleted}
          products={products}
        />
      )}

      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onSubmit={(data) => handleEditProduct(editingProduct.id, data)}
          onCancel={() => setEditingProduct(null)}
          availableCategories={customCategories}
          onCategoryAdded={handleCategoryAdded}
          onCategoryDeleted={handleCategoryDeleted}
          products={products}
        />
      )}

      {viewingProduct && createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-4 py-3 border-b border-amber-200/50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-500 rounded-lg shadow-md">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                {viewingProduct.name}
              </h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg border border-amber-200/50 shadow-sm">
                    <Hash className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-gray-600">SKU</span>
                    <span className="text-xs font-semibold text-gray-900 font-mono">{viewingProduct.sku}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg border border-amber-200/50 shadow-sm">
                    <Hash className="h-3.5 w-3.5 text-amber-600" />
                    <span className="text-xs font-medium text-gray-600">HUID</span>
                    <span className="text-xs font-semibold text-gray-900 font-mono">{viewingProduct.huid || '-'}</span>
                  </div>
                {viewingProduct.barcode && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/80 backdrop-blur-sm rounded-lg border border-amber-200/50 shadow-sm">
                      <Barcode className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-xs font-medium text-gray-600">Barcode</span>
                      <span className="text-xs font-semibold text-gray-900 font-mono">{viewingProduct.barcode}</span>
                    </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setViewingProduct(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
              title={t('inventory.close')}
            >
                <X className="h-4 w-4" />
            </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-3 space-y-3 overflow-y-auto flex-grow bg-gray-50/30">
            {/* Classification & Purity */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-1.5 border-b border-gray-200 flex gap-2">
                {t('inventory.classificationPurity')}
                {/* <Sparkles className="h-3.5 w-3.5 text-amber-600" /> */}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Hash className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('common.category')}
                  </label>
                </div>
                  <p className="text-sm font-bold text-gray-900 text-center">{viewingProduct.category || '-'}</p>
                </div>
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.materialType')}
                  </label>
                  </div>
                  <p className="text-sm font-bold text-gray-900 text-center">
                    {viewingProduct.material_type ? t(`inventory.${viewingProduct.material_type.toLowerCase()}`) : t('inventory.gold')}
                  </p>
                </div>
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.purity')}
                  </label>
                </div>
                  <p className="text-sm font-bold text-gray-900 text-center">{viewingProduct.purity || '-'}</p>
                </div>
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <User className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.targetGroup')}
                  </label>
                  </div>
                  <div className="flex justify-center">
                  {viewingProduct.product_category ? (
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                      {productCategoryLabels[viewingProduct.product_category] || viewingProduct.product_category}
                    </span>
                  ) : (
                      <span className="text-xs text-gray-400 italic">{t('inventory.notSpecified')}</span>
                  )}
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Status */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 pb-1.5 border-b border-gray-200 flex gap-2">
               
                {t('inventory.inventoryStatus')}
                {/* <Package className="h-3.5 w-3.5 text-amber-600" /> */}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Scale className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.unitWeight')}
                  </label>
                </div>
                  <p className="text-lg font-bold text-gray-900 text-center">
                    {viewingProduct.weight || 0}
                    <span className="text-xs font-normal text-gray-600 ml-1">g</span>
                  </p>
                </div>
                <div className="p-3  rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Package className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.currentStock')}
                  </label>
                  </div>
                  <div className="flex items-baseline justify-center gap-1.5 flex-wrap">
                    <p className="text-lg font-bold text-gray-900">{viewingProduct.stock_quantity || 0}</p>
                    {viewingProduct.stock_quantity <= (viewingProduct.min_stock_level || 0) && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {t('inventory.low')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.minimumLevel')}
                  </label>
                </div>
                  <p className="text-lg font-bold text-gray-900 text-center">{viewingProduct.min_stock_level || 0}</p>
                </div>
                <div className="p-3 rounded-lg border transition-all">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Info className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {t('common.status')}
                    </label>
                  </div>
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                      viewingProduct.status === 'active' 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {t(`common.${viewingProduct.status || 'active'}`)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit History */}
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 pb-1.5 border-b border-gray-200 flex gap-2">
              
                {t('inventory.auditHistory')}
                {/* <Clock className="h-3.5 w-3.5 text-amber-600" /> */}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Clock className="h-3.5 w-3.5 text-green-500" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.recordCreated')}
                  </label>
                </div>
                  <div className="flex flex-col gap-0.5 items-center">
                    <span className="text-xs font-semibold text-gray-900">
                      {new Date(viewingProduct.created_at).toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="text-xs font-mono text-gray-600">
                      {new Date(viewingProduct.created_at).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-center gap-1.5 mb-1.5">
                    <Clock className="h-3.5 w-3.5 text-green-500" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {t('inventory.lastModified')}
                  </label>
                  </div>
                  <div className="flex flex-col gap-0.5 items-center">
                    <span className="text-xs font-semibold text-gray-900">
                      {new Date(viewingProduct.updated_at).toLocaleDateString('en-IN', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="text-xs font-mono text-gray-600">
                      {new Date(viewingProduct.updated_at).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Section */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex justify-end items-center gap-2">
              <button
                onClick={() => setViewingProduct(null)}
              className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all font-medium text-xs"
              >
                {t('inventory.close')}
              </button>
              <button
                onClick={() => {
                  setViewingProduct(null);
                  setEditingProduct(viewingProduct);
                }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all font-medium text-xs shadow-md hover:shadow-lg"
              >
              <Wrench className="h-3.5 w-3.5" />
                {t('inventory.editProductDetails')}
              </button>
            </div>
          </div>
      </div>,
      document.body
    )}

      {/* Delete product confirmation modal */}
      {productToDelete && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-red-50 via-red-50 to-red-50 px-4 py-3 border-b border-red-200/50 rounded-t-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-500 rounded-lg shadow-md">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('inventory.confirmDelete')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setProductToDelete(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
                  title={t('inventory.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 bg-gray-50/30">
              <p className="text-sm text-gray-700 mb-6">
                {t('inventory.confirmDelete')}
              </p>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cascade delete confirmation modal */}
      {cascadeDeleteInfo && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-red-50 via-red-50 to-red-50 px-4 py-3 border-b border-red-200/50 rounded-t-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-500 rounded-lg shadow-md">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('inventory.productHasReferences')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setCascadeDeleteInfo(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
                  title={t('inventory.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 bg-gray-50/30">
              <p className="text-sm text-gray-700 mb-6">
                {cascadeDeleteInfo.message}
              </p>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCascadeDeleteInfo(null)}
                  className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmCascadeDeleteProduct}
                  className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                >
                  {t('inventory.deleteWithReferences')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete category confirmation modal */}
      {categoryToDelete && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-red-50 via-red-50 to-red-50 px-4 py-3 border-b border-red-200/50 rounded-t-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-500 rounded-lg shadow-md">
                      <AlertTriangle className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('inventory.confirmDeleteCategoryTitle')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setCategoryToDelete(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
                  title={t('inventory.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 bg-gray-50/30">
              <p className="text-sm text-gray-700 mb-6">
                {t('inventory.confirmDeleteCategory', { category: categoryToDelete })}
              </p>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCategory}
                  className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Inventory;