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
        error('Failed to load users');
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleSaveUser = async () => {
    if (!userFormData.username || !userFormData.email || !userFormData.fullName) {
      error('Please fill in all required fields');
      return;
    }

    if (!editingUser && !userFormData.password) {
      error('Password is required for new users');
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
        success('User updated successfully');
      } else {
        // Create new user
        await apiEndpoints.auth.createUser(userFormData);
        success('User created successfully');
      }
      setShowUserForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await apiEndpoints.auth.deleteUser(userToDelete.id);
      success('User deleted successfully');
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordUserId) return;

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      error('Password must be at least 6 characters long');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      error('Passwords do not match');
      return;
    }

    try {
      await apiEndpoints.auth.changePassword(passwordUserId, {
        newPassword: passwordData.newPassword,
        currentPassword: passwordData.currentPassword || undefined
      });
      success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordUserId(null);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err: any) {
      console.error('Error changing password:', err);
      error(err.response?.data?.message || 'Failed to change password');
    }
  };

  // Check if user has access
  if (!currentUser || currentUser.role === 'finance_manager') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access user management.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.userManagement') || 'User Management'}</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
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
          <span>{t('settings.addUser') || 'Add User'}</span>
        </button>
      </div>

      {/* Users List */}
      {isLoadingUsers ? (
        <div className="flex items-center justify-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('settings.userName') || 'Username'}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('settings.fullName') || 'Full Name'}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('common.email')}</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('settings.role') || 'Role'}</th>
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
                      {user.role === 'superadmin' ? 'Super Admin' :
                       user.role === 'admin' ? 'Admin' :
                       'Finance Manager'}
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
                       'Suspended'}
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
                            : 'Only Superadmin can edit Superadmin users'
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
                            ? t('settings.changePassword') || 'Change Password'
                            : 'Only Superadmin can change Superadmin passwords'
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
                            : 'Only Superadmin can delete Superadmin users'
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
              <p className="text-gray-500">{t('settings.noUsersFound') || 'No users found'}</p>
            </div>
          )}
        </div>
      )}

      {/* User Form Modal */}
      {showUserForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingUser ? t('settings.editUser') || 'Edit User' : t('settings.addUser') || 'Add User'}
                </h3>
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
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('settings.userName') || 'Username'} *
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
                    {t('settings.fullName') || 'Full Name'} *
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
                    {t('settings.role') || 'Role'} *
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
                    <option value="finance_manager">Finance Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  {editingUser && editingUser.id === currentUser?.id && editingUser.role === 'superadmin' && (
                    <p className="mt-1 text-xs text-amber-600">
                      Superadmin cannot change their own role
                    </p>
                  )}
                  {currentUser?.role === 'admin' && editingUser && editingUser.role === 'superadmin' && (
                    <p className="mt-1 text-xs text-red-600">
                      You cannot edit Superadmin users
                    </p>
                  )}
                </div>
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.password') || 'Password'} *
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
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
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
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('settings.changePassword') || 'Change Password'}
                </h3>
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
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.currentPassword') || 'Current Password'} {passwordUserId !== currentUser?.id ? '(Optional for Admin)' : '*'}
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
                  {t('settings.newPassword') || 'New Password'} *
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
                  {t('settings.confirmPassword') || 'Confirm Password'} *
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
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
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                  {t('settings.updatePassword') || 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete User Confirmation Modal */}
      {showDeleteConfirm && userToDelete && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-scale-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center space-x-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {t('settings.deleteUser') || 'Delete User'}
              </h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              {t('settings.confirmDeleteUser') || 'Are you sure you want to delete this user?'} <strong>{userToDelete.username}</strong>?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UserManagement;

