import React, { useState } from 'react';
import {
  User,
  Store,
  CreditCard,
  Bell,
  Shield,
  Download,
  Upload,
  Trash2,
  Save
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Settings: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('business');
  const [businessInfo, setBusinessInfo] = useState({
    name: 'Golden Jewelers',
    address: '123 Jewelry Street, Chennai - 600001',
    phone: '+91 98765 43210',
    email: 'info@goldenjewelers.com',
    gstin: '33AAAAA0000A1Z5',
    license: 'BIS-123456',
  });

  const [taxSettings, setTaxSettings] = useState({
    gst_rate: 3,
    making_charge_tax: true,
    discount_before_tax: true,
  });

  const [userProfile, setUserProfile] = useState({
    name: 'Admin User',
    email: 'admin@goldenjewelers.com',
    role: 'Owner',
    phone: '+91 98765 43210',
  });

  const tabs = [
    { id: 'business', name: t('settings.businessInfo'), icon: Store },
    { id: 'user', name: t('settings.userProfile'), icon: User },
    { id: 'tax', name: t('settings.taxSettings'), icon: CreditCard },
    { id: 'notifications', name: t('settings.notifications'), icon: Bell },
    { id: 'security', name: t('settings.security'), icon: Shield },
    { id: 'data', name: t('settings.dataManagement'), icon: Download },
  ];

  const handleSave = () => {
    alert(t('settings.settingsSavedSuccessfully'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-600 mt-1">{t('settings.subtitle')}</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Save className="h-4 w-4" />
          <span>{t('settings.saveChanges')}</span>
        </button>
      </div>

      <div className="flex space-x-6">
        {/* Settings Navigation */}
        <div className="w-64 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-amber-100 text-amber-700 border-r-4 border-amber-500'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
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
        <div className="flex-1 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          {activeTab === 'business' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Address *
                  </label>
                  <textarea
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    value={businessInfo.gstin}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, gstin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    BIS License Number
                  </label>
                  <input
                    type="text"
                    value={businessInfo.license}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, license: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'user' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
              
              <div className="flex items-center space-x-6">
                <div className="h-20 w-20 bg-amber-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-amber-600" />
                </div>
                <div>
                  <button className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                    Upload Photo
                  </button>
                  <p className="text-sm text-gray-600 mt-2">JPG, GIF or PNG. Max size 2MB</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.userEmailAddress')} *
                  </label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.userPhoneNumber')}
                  </label>
                  <input
                    type="tel"
                    value={userProfile.phone}
                    onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={userProfile.role}
                    onChange={(e) => setUserProfile({ ...userProfile, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Tax Configuration</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default GST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={taxSettings.gst_rate}
                      onChange={(e) => setTaxSettings({ ...taxSettings, gst_rate: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Apply Tax on Making Charges</h3>
                      <p className="text-sm text-gray-600">Include making charges in tax calculation</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taxSettings.making_charge_tax}
                        onChange={(e) => setTaxSettings({ ...taxSettings, making_charge_tax: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Apply Discount Before Tax</h3>
                      <p className="text-sm text-gray-600">Calculate tax on discounted amount</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={taxSettings.discount_before_tax}
                        onChange={(e) => setTaxSettings({ ...taxSettings, discount_before_tax: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
              
              <div className="space-y-6">
                <div className="p-6 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Backup & Export</h3>
                  <div className="space-y-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                      <Download className="h-4 w-4" />
                      <span>Export All Data</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      <Download className="h-4 w-4" />
                      <span>Export Invoices</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                      <Download className="h-4 w-4" />
                      <span>Export Products</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-6 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">Import Data</h3>
                  <div className="space-y-4">
                    <button className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Import Products</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Import Customers</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-900 mb-4">Danger Zone</h3>
                  <p className="text-sm text-red-700 mb-4">
                    These actions are irreversible. Please be careful.
                  </p>
                  <button className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    <Trash2 className="h-4 w-4" />
                    <span>Clear All Data</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'notifications' || activeTab === 'security') && (
            <div className="text-center py-12">
              <div className="h-12 w-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                {activeTab === 'notifications' ? (
                  <Bell className="h-6 w-6 text-gray-400" />
                ) : (
                  <Shield className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'notifications' ? 'Notifications' : 'Security Settings'}
              </h3>
              <p className="text-gray-600">
                This section will be available in future updates.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;