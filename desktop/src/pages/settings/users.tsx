import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { Plus, Edit2, Trash2, UserCheck, UserX, Shield, Eye } from 'lucide-react';

interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  username: string;
  phone?: string;
  role: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface CreateUserRequest {
  email: string;
  full_name: string;
  username: string;
  password: string;
  phone?: string;
  role?: string;
}

interface UpdateUserRequest {
  email?: string;
  full_name?: string;
  username?: string;
  phone?: string;
  role?: string;
  is_active?: boolean;
}

export const UsersPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const currentUser = useAuthStore((state) => state.user);
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'accountant' | 'viewer'>('viewer');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const result = await invoke<User[]>('get_users', {
        tenantIdParam: tenant.id,
      });
      setUsers(result);
    } catch (error) {
      console.error('Kullanıcılar yüklenemedi:', error);
      alert('❌ Kullanıcılar yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    if (!email || !fullName || !username || !password) {
      alert('❌ Tüm zorunlu alanları doldurun!');
      return;
    }

    if (!email.includes('@')) {
      alert('❌ Geçerli bir email adresi girin!');
      return;
    }

    if (password.length < 6) {
      alert('❌ Şifre en az 6 karakter olmalıdır!');
      return;
    }

    try {
      await invoke('create_user', {
        tenantIdParam: tenant.id,
        data: {
          email,
          full_name: fullName,
          username,
          password,
          phone: phone || null,
          role: role || 'viewer',
        } as CreateUserRequest,
      });
      
      alert('✅ Kullanıcı başarıyla oluşturuldu!');
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Kullanıcı oluşturulamadı:', error);
      alert('❌ Kullanıcı oluşturulamadı: ' + error);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEmail(user.email);
    setFullName(user.full_name);
    setUsername(user.username);
    setPhone(user.phone || '');
    setRole(user.role as 'admin' | 'accountant' | 'viewer');
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingUser) return;

    if (!email || !fullName || !username) {
      alert('❌ Tüm zorunlu alanları doldurun!');
      return;
    }

    try {
      await invoke('update_user', {
        tenantIdParam: tenant.id,
        userId: editingUser.id,
        data: {
          email,
          full_name: fullName,
          username,
          phone: phone || null,
          role,
        } as UpdateUserRequest,
      });
      
      alert('✅ Kullanıcı başarıyla güncellendi!');
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Kullanıcı güncellenemedi:', error);
      alert('❌ Kullanıcı güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.is_superuser) {
      alert('❌ Superuser silinemez!');
      return;
    }

    if (user.id === currentUser?.id) {
      alert('❌ Kendi hesabınızı silemezsiniz!');
      return;
    }

    if (!confirm(`${user.full_name} kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    if (!tenant) return;

    try {
      await invoke('delete_user', {
        tenantIdParam: tenant.id,
        userId: user.id,
      });
      
      alert('✅ Kullanıcı başarıyla silindi!');
      loadUsers();
    } catch (error) {
      console.error('Kullanıcı silinemedi:', error);
      alert('❌ Kullanıcı silinemedi: ' + error);
    }
  };

  const handleActivate = async (user: User) => {
    if (!tenant) return;

    try {
      await invoke('activate_user', {
        tenantIdParam: tenant.id,
        userId: user.id,
      });
      
      alert('✅ Kullanıcı aktif edildi!');
      loadUsers();
    } catch (error) {
      console.error('Kullanıcı aktif edilemedi:', error);
      alert('❌ Kullanıcı aktif edilemedi: ' + error);
    }
  };

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setUsername('');
    setPassword('');
    setPhone('');
    setRole('viewer');
    setEditingUser(null);
  };

  const getRoleBadge = (role: string) => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      accountant: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    
    const roleLabels = {
      admin: 'Yönetici',
      accountant: 'Muhasebe',
      viewer: 'Görüntüleyici',
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role as keyof typeof roleColors] || roleColors.viewer}`}>
        {roleLabels[role as keyof typeof roleLabels] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600 mt-1">Sistem kullanıcılarını yönetin</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni Kullanıcı</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Toplam Kullanıcı</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{users.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Aktif</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {users.filter(u => u.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Yönetici</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {users.filter(u => u.role === 'admin').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-600 text-sm">Muhasebe</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {users.filter(u => u.role === 'accountant').length}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Kullanıcı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                İletişim
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Son Giriş
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  Henüz kullanıcı bulunmamaktadır.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {user.is_superuser ? (
                          <Shield className="h-5 w-5 text-red-600" />
                        ) : (
                          <span className="text-gray-600 font-semibold">
                            {user.full_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                    {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Aktif
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Düzenle"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      
                      {!user.is_active && (
                        <button
                          onClick={() => handleActivate(user)}
                          className="text-green-600 hover:text-green-900"
                          title="Aktif Et"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}
                      
                      {!user.is_superuser && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Yeni Kullanıcı Ekle</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şifre *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'accountant' | 'viewer')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Görüntüleyici</option>
                  <option value="accountant">Muhasebe</option>
                  <option value="admin">Yönetici</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Kullanıcı Düzenle</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kullanıcı Adı *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {!editingUser.is_superuser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'accountant' | 'viewer')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Görüntüleyici</option>
                    <option value="accountant">Muhasebe</option>
                    <option value="admin">Yönetici</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
