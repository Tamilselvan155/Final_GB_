import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  Plus,
  Edit,
  Lock,
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { apiEndpoints } from '../services/api';

const UserManagement: React.FC = () => {
  const { t } = useLanguage();
  const { success, error } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'finance_manager',
    fullName: '',
    status: 'active'
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await apiEndpoints.auth.getUsers();
      if (response.data.success) {
        setUsers(response.data.data);
      } else {
        error(t('settings.failedToLoadUsers'));
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      // Extract backend error message
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      if (backendMessage) {
        error(backendMessage);
      } else {
        error(t('settings.failedToLoadUsers'));
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSaveUser = async () => {
    if (!userFormData.username || !userFormData.email || !userFormData.fullName) {
      error(t('settings.fillAllRequiredFields'));
      return;
    }

    if (!editingUser && !userFormData.password) {
      error(t('settings.passwordRequiredNewUsers'));
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updateData: any = {
          username: userFormData.username,
          email: userFormData.email,
          role: userFormData.role,
          fullName: userFormData.fullName,
          status: userFormData.status
        };
        await apiEndpoints.auth.updateUser(editingUser.id, updateData);
        success(t('settings.userUpdatedSuccessfully'));
      } else {
        // Create new user
        await apiEndpoints.auth.createUser(userFormData);
        success(t('settings.userCreatedSuccessfully'));
      }
      setShowUserForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      // Extract backend error message
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      if (backendMessage) {
        error(backendMessage);
      } else {
        error(t('settings.failedToSaveUser'));
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await apiEndpoints.auth.deleteUser(userToDelete.id);
      success(t('settings.userDeletedSuccessfully'));
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      // Extract backend error message
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      if (backendMessage) {
        error(backendMessage);
      } else {
        error(t('settings.failedToDeleteUser'));
      }
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUserId) return;

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      error(t('settings.passwordMinLength'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error(t('settings.passwordsDoNotMatch'));
      return;
    }

    try {
      await apiEndpoints.auth.changePassword(passwordUserId, {
        newPassword: passwordData.newPassword,
        currentPassword: passwordData.currentPassword || undefined
      });
      success(t('settings.passwordChangedSuccessfully'));
      setShowPasswordModal(false);
      setPasswordUserId(null);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      console.error('Error changing password:', err);
      // Extract backend error message
      const backendMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || '';
      if (backendMessage) {
        error(backendMessage);
      } else {
        error(t('settings.failedToChangePassword'));
      }
    }
  };

  // Check if user has access
  if (!currentUser || currentUser.role === 'finance_manager') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('settings.accessDenied')}</h1>
          <p className="text-gray-600">{t('settings.noPermissionUserManagement')}</p>
        </div>
      </div>
    );
  }

  // Helper functions to check permissions
  const canEditUser = (targetUser: any) => {
    // Superadmin can edit anyone
    if (currentUser.role === 'superadmin') return true;
    // Admin cannot edit superadmin
    if (currentUser.role === 'admin' && targetUser.role === 'superadmin') return false;
    // Admin can edit admin and finance_manager
    return true;
  };

  const canDeleteUser = (targetUser: any) => {
    // Superadmin can delete anyone
    if (currentUser.role === 'superadmin') return true;
    // Admin cannot delete superadmin
    if (currentUser.role === 'admin' && targetUser.role === 'superadmin') return false;
    // Admin can delete admin and finance_manager
    return true;
  };

  const canChangePassword = (targetUser: any) => {
    // Superadmin can change anyone's password
    if (currentUser.role === 'superadmin') return true;
    // Admin cannot change superadmin password
    if (currentUser.role === 'admin' && targetUser.role === 'superadmin') return false;
    // Admin can change admin and finance_manager passwords
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.userManagement')}</h1>
          <p className="text-gray-600 mt-1">{t('settings.manageUsersRolesPermissions')}</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setUserFormData({
              username: '',
              email: '',
              password: '',
              role: 'finance_manager',
              fullName: '',
              status: 'active'
            });
            setShowUserForm(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>{t('settings.addUser')}</span>
        </button>
      </div>

      {/* Users List */}
      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">{t('settings.loadingUsers')}</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('settings.userName')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('settings.fullName')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('common.email')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('settings.role')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('common.status')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {user.role === 'superadmin' ? t('settings.superAdmin') :
                       user.role === 'admin' ? t('settings.admin') :
                       t('settings.financeManager')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? t('common.active') :
                       user.status === 'inactive' ? t('common.inactive') :
                       t('settings.suspended')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setUserFormData({
                            username: user.username,
                            email: user.email,
                            password: '',
                            role: user.role,
                            fullName: user.fullName,
                            status: user.status
                          });
                          setShowUserForm(true);
                        }}
                        disabled={!canEditUser(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          canEditUser(user)
                            ? 'text-amber-600 hover:bg-amber-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={
                          canEditUser(user)
                            ? t('common.edit')
                            : t('settings.onlySuperadminEditSuperadmin')
                        }
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setPasswordUserId(user.id);
                          setPasswordData({
                            currentPassword: '',
                            newPassword: '',
                            confirmPassword: ''
                          });
                          setShowPasswordModal(true);
                        }}
                        disabled={!canChangePassword(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          canChangePassword(user)
                            ? 'text-blue-600 hover:bg-blue-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={
                          canChangePassword(user)
                            ? t('settings.changePassword')
                            : t('settings.onlySuperadminChangePassword')
                        }
                      >
                        <Lock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setShowDeleteConfirm(true);
                        }}
                        disabled={!canDeleteUser(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          canDeleteUser(user)
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                        title={
                          canDeleteUser(user)
                            ? t('common.delete')
                            : t('settings.onlySuperadminDeleteSuperadmin')
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t('settings.noUsersFound')}</p>
            </div>
          )}
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 px-4 py-3 border-b border-amber-200/50 rounded-t-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-amber-500 rounded-lg shadow-md">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {editingUser ? t('settings.editUser') : t('settings.addUser')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    setUserFormData({
                      username: '',
                      email: '',
                      password: '',
                      role: 'finance_manager',
                      fullName: '',
                      status: 'active'
                    });
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
                  title={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Content Section */}
            <div className="p-6 space-y-4 overflow-y-auto flex-grow bg-gray-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.userName')} *
                  </label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.fullName')} *
                  </label>
                  <input
                    type="text"
                    value={userFormData.fullName}
                    onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('common.email')} *
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.role')} *
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    disabled={
                      editingUser && (
                        !canEditUser(editingUser) || 
                        (editingUser.id === currentUser?.id && editingUser.role === 'superadmin')
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="finance_manager">{t('settings.financeManager')}</option>
                    <option value="admin">{t('settings.admin')}</option>
                  </select>
                  {editingUser && editingUser.id === currentUser?.id && editingUser.role === 'superadmin' && (
                    <p className="mt-1 text-xs text-amber-600">
                      {t('settings.superadminCannotChangeOwnRole')}
                    </p>
                  )}
                  {currentUser?.role === 'admin' && editingUser && editingUser.role === 'superadmin' && (
                    <p className="mt-1 text-xs text-red-600">
                      {t('settings.cannotEditSuperadmin')}
                    </p>
                  )}
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.password')} *
                    </label>
                    <input
                      type="password"
                      value={userFormData.password}
                      onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('common.status')} *
                  </label>
                  <select
                    value={userFormData.status}
                    onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="active">{t('common.active')}</option>
                    <option value="inactive">{t('common.inactive')}</option>
                    <option value="suspended">{t('settings.suspended')}</option>
                  </select>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setEditingUser(null);
                    setUserFormData({
                      username: '',
                      email: '',
                      password: '',
                      role: 'finance_manager',
                      fullName: '',
                      status: 'active'
                    });
                  }}
                  className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveUser}
                  className="flex-1 bg-amber-500 text-white py-2.5 px-4 rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-sm"
                >
                  {editingUser ? t('common.save') : t('common.add')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Change Password Modal */}
      {showPasswordModal && passwordUserId && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-scale-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 via-blue-50 to-blue-50 px-4 py-3 border-b border-blue-200/50 rounded-t-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg shadow-md">
                      <Lock className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('settings.changePassword')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordUserId(null);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
                  title={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Content Section */}
            <div className="p-6 space-y-4 bg-gray-50/30">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.currentPassword')} {passwordUserId !== currentUser?.id ? t('settings.currentPasswordOptional') : '*'}
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.newPassword')} *
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.confirmPassword')} *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordUserId(null);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  className="flex-1 bg-amber-500 text-white py-2.5 px-4 rounded-lg hover:bg-amber-600 transition-colors font-medium shadow-sm"
                >
                  {t('settings.updatePassword')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && userToDelete && createPortal(
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
                      {t('settings.deleteUser')}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-lg transition-all flex-shrink-0"
                  title={t('common.close')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 bg-gray-50/30">
              <p className="text-sm text-gray-700 mb-6">
                {t('settings.confirmDeleteUser')} <strong>{userToDelete.username}</strong>?
              </p>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  className="flex-1 bg-gray-500 text-white py-2.5 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium shadow-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
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

export default UserManagement;

