import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { Users, Plus, Edit2, Trash2, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: string;
}

export const AyarlarKullanicilarPage: React.FC = () => {
  const tenant = useAuthStore((state) => state.tenant);
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [formData, setFormData] = React.useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'viewer',
  });

  React.useEffect(() => {
    if (tenant) {
      loadUsers();
    }
  }, [tenant]);

  const loadUsers = async () => {
    if (!tenant) return;
    
    try {
      setLoading(true);
      const data = await invoke<User[]>('get_users', { tenantIdParam: tenant.id });
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    try {
      await invoke('create_user', {
        tenantIdParam: tenant.id,
        input: formData,
      });
      
      setShowCreateModal(false);
      setFormData({
        username: '',
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'viewer',
      });
      
      await loadUsers();
    } catch (error) {
      alert(`Hata: ${error}`);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await invoke('delete_user', {
        userId,
        tenantIdParam: tenant?.id,
      });
      await loadUsers();
    } catch (error) {
      alert(`Hata: ${error}`);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-800',
      accountant: 'bg-blue-100 text-blue-800',
      viewer: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      admin: 'Yönetici',
      accountant: 'Muhasebeci',
      viewer: 'Görüntüleyici',
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[role] || colors.viewer}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (loading) {
    return <div className="p-6 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600 mt-1">Sistem kullanıcıları ve yetkileri</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-macos flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Yeni Kullanıcı
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Kullanıcı Adı
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ad Soyad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Son Giriş
              </th>
              {currentUser?.role === 'admin' && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  İşlemler
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {user.full_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {user.email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {user.last_login 
                    ? new Date(user.last_login).toLocaleDateString('tr-TR')
                    : 'Hiç giriş yapmadı'}
                </td>
                {currentUser?.role === 'admin' && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={user.id.toString() === currentUser.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Henüz kullanıcı yok</p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Kullanıcı</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-6 px-6 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı *
              </label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input-macos"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Soyad *
              </label>
              <input
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input-macos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-macos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-macos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input-macos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rol *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-macos"
              >
                <option value="viewer">Görüntüleyici</option>
                <option value="accountant">Muhasebeci</option>
                <option value="admin">Yönetici</option>
              </select>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn-macos"
              >
                Oluştur
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AyarlarKullanicilarPage;
