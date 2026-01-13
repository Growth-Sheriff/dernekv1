import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Calendar, MapPin, Users, Pencil, Trash2, CalendarDays } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Etkinlik {
  id: string;
  etkinlik_tipi?: string;
  baslik: string;
  baslangic_tarihi: string;
  bitis_tarihi?: string;
  yer?: string;
  durum?: string;
  katilimci_sayisi?: number;
  tahmini_butce?: number;
  gerceklesen_butce?: number;
  aciklama?: string;
  notlar?: string;
}

export const EtkinliklerListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  
  const [etkinlikler, setEtkinlikler] = React.useState<Etkinlik[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string>('all');
  const [search, setSearch] = React.useState<string>('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Etkinlik | null>(null);
  const [formData, setFormData] = React.useState({
    etkinlik_tipi: 'DÜĞÜN',
    baslik: '',
    aciklama: '',
    baslangic_tarihi: new Date().toISOString().split('T')[0],
    bitis_tarihi: '',
    yer: '',
    durum: 'Planlandı',
    tahmini_butce: '',
    katilimci_sayisi: '',
    sorumlu_uye_id: '',
    notlar: '',
  });

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadEtkinlikler();
  }, [tenant, filter]);

  const loadEtkinlikler = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const result = await invoke<Etkinlik[]>('get_etkinlikler', {
        tenantIdParam: tenant.id,
        durum: filter === 'all' ? null : filter,
        skip: 0,
        limit: 100,
      });
      setEtkinlikler(result);
    } catch (error) {
      console.error('Failed to load etkinlikler:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEtkinlik = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) {
      toast.error('Tenant bilgisi bulunamadı!');
      return;
    }

    if (!formData.baslik || !formData.baslangic_tarihi) {
      toast.error('Başlık ve Başlangıç Tarihi alanları zorunludur!');
      return;
    }

    try {
      await invoke('create_etkinlik', {
        tenantIdParam: tenant.id,
        data: {
          etkinlik_tipi: formData.etkinlik_tipi || null,
          baslik: formData.baslik,
          aciklama: formData.aciklama || null,
          baslangic_tarihi: formData.baslangic_tarihi,
          bitis_tarihi: formData.bitis_tarihi || null,
          yer: formData.yer || null,
          durum: formData.durum || null,
          tahmini_butce: formData.tahmini_butce ? parseFloat(formData.tahmini_butce) : null,
          katilimci_sayisi: formData.katilimci_sayisi ? parseInt(formData.katilimci_sayisi) : null,
          sorumlu_uye_id: formData.sorumlu_uye_id || null,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Etkinlik başarıyla oluşturuldu!');
      setShowCreateModal(false);
      setFormData({
        etkinlik_tipi: 'DÜĞÜN',
        baslik: '',
        aciklama: '',
        baslangic_tarihi: new Date().toISOString().split('T')[0],
        bitis_tarihi: '',
        yer: '',
        durum: 'Planlandı',
        tahmini_butce: '',
        katilimci_sayisi: '',
        sorumlu_uye_id: '',
        notlar: '',
      });
      loadEtkinlikler();
    } catch (error) {
      console.error('Failed to create etkinlik:', error);
      toast.error('Etkinlik oluşturulamadı: ' + error);
    }
  };

  const handleEdit = (etkinlik: Etkinlik) => {
    setEditingItem(etkinlik);
    setFormData({
      etkinlik_tipi: etkinlik.etkinlik_tipi || 'DÜĞÜN',
      baslik: etkinlik.baslik,
      aciklama: etkinlik.aciklama || '',
      baslangic_tarihi: etkinlik.baslangic_tarihi,
      bitis_tarihi: etkinlik.bitis_tarihi || '',
      yer: etkinlik.yer || '',
      durum: etkinlik.durum || 'Planlandı',
      tahmini_butce: etkinlik.tahmini_butce?.toString() || '',
      katilimci_sayisi: etkinlik.katilimci_sayisi?.toString() || '',
      sorumlu_uye_id: '',
      notlar: etkinlik.notlar || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !editingItem) return;

    try {
      await invoke('update_etkinlik', {
        tenantIdParam: tenant.id,
        etkinlikId: editingItem.id,
        data: {
          etkinlik_tipi: formData.etkinlik_tipi || null,
          baslik: formData.baslik,
          aciklama: formData.aciklama || null,
          baslangic_tarihi: formData.baslangic_tarihi,
          bitis_tarihi: formData.bitis_tarihi || null,
          yer: formData.yer || null,
          durum: formData.durum || null,
          tahmini_butce: formData.tahmini_butce ? parseFloat(formData.tahmini_butce) : null,
          katilimci_sayisi: formData.katilimci_sayisi ? parseInt(formData.katilimci_sayisi) : null,
          notlar: formData.notlar || null,
        },
      });
      toast.success('Etkinlik başarıyla güncellendi!');
      setShowEditModal(false);
      setEditingItem(null);
      loadEtkinlikler();
    } catch (error) {
      console.error('Failed to update etkinlik:', error);
      toast.error('Etkinlik güncellenemedi: ' + error);
    }
  };

  const handleDelete = async (etkinlikId: string) => {
    if (!tenant) return;
    
    if (!confirm('Bu etkinliği silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      await invoke('delete_etkinlik', {
        tenantIdParam: tenant.id,
        etkinlikId,
      });
      
      toast.success('Etkinlik başarıyla silindi!');
      loadEtkinlikler();
    } catch (error) {
      console.error('Etkinlik silinemedi:', error);
      toast.error('Etkinlik silinemedi: ' + error);
    }
  };

  const filteredEtkinlikler = etkinlikler.filter(e => 
    e.baslik.toLowerCase().includes(search.toLowerCase()) ||
    (e.etkinlik_tipi || '').toLowerCase().includes(search.toLowerCase())
  );

  const getDurumVariant = (durum: string): 'default' | 'success' | 'warning' | 'error' | 'secondary' => {
    switch (durum) {
      case 'Planlandı': return 'default';
      case 'Devam Ediyor': return 'warning';
      case 'Tamamlandı': return 'success';
      case 'İptal': return 'error';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Etkinlikler"
        description="Dernek etkinliklerini yönetin"
        icon={CalendarDays}
        actions={
          <Button onClick={() => navigate('/etkinlikler/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Yeni Etkinlik
          </Button>
        }
      />

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Etkinlik Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateEtkinlik} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Etkinlik Türü *</label>
                <select
                  value={formData.etkinlik_tipi}
                  onChange={(e) => setFormData({ ...formData, etkinlik_tipi: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="DÜĞÜN">DÜĞÜN</option>
                  <option value="NİŞAN">NİŞAN</option>
                  <option value="KINA">KINA</option>
                  <option value="SÜNNET">SÜNNET</option>
                  <option value="CENAZE">CENAZE</option>
                  <option value="MEVLİT">MEVLİT</option>
                  <option value="TOPLANTI">TOPLANTI</option>
                  <option value="GENEL KURUL">GENEL KURUL</option>
                  <option value="DİĞER">DİĞER</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum *</label>
                <select
                  value={formData.durum}
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="Planlandı">Planlandı</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal">İptal</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
              <input
                type="text"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                className="input-macos"
                placeholder="Etkinlik başlığı"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={formData.aciklama}
                onChange={(e) => setFormData({ ...formData, aciklama: e.target.value })}
                className="input-macos"
                rows={2}
                placeholder="Etkinlik açıklaması"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi *</label>
                <input
                  type="date"
                  value={formData.baslangic_tarihi}
                  onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                  className="input-macos"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={formData.bitis_tarihi}
                  onChange={(e) => setFormData({ ...formData, bitis_tarihi: e.target.value })}
                  className="input-macos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Katılımcı Sayısı</label>
                <input
                  type="number"
                  value={formData.katilimci_sayisi}
                  onChange={(e) => setFormData({ ...formData, katilimci_sayisi: e.target.value })}
                  className="input-macos"
                  placeholder="100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yer</label>
              <input
                type="text"
                value={formData.yer}
                onChange={(e) => setFormData({ ...formData, yer: e.target.value })}
                className="input-macos"
                placeholder="Etkinlik yeri"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahmini Bütçe (TL)</label>
              <input
                type="number"
                value={formData.tahmini_butce}
                onChange={(e) => setFormData({ ...formData, tahmini_butce: e.target.value })}
                className="input-macos"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notlar</label>
              <textarea
                value={formData.notlar}
                onChange={(e) => setFormData({ ...formData, notlar: e.target.value })}
                className="input-macos"
                rows={2}
                placeholder="Ek notlar..."
              />
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
                Kaydet
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etkinlik Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Etkinlik Türü *</label>
                <select
                  value={formData.etkinlik_tipi}
                  onChange={(e) => setFormData({ ...formData, etkinlik_tipi: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="DÜĞÜN">DÜĞÜN</option>
                  <option value="NİŞAN">NİŞAN</option>
                  <option value="KINA">KINA</option>
                  <option value="SÜNNET">SÜNNET</option>
                  <option value="CENAZE">CENAZE</option>
                  <option value="MEVLİT">MEVLİT</option>
                  <option value="TOPLANTI">TOPLANTI</option>
                  <option value="GENEL KURUL">GENEL KURUL</option>
                  <option value="DİĞER">DİĞER</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durum *</label>
                <select
                  value={formData.durum}
                  onChange={(e) => setFormData({ ...formData, durum: e.target.value })}
                  className="input-macos"
                  required
                >
                  <option value="Planlandı">Planlandı</option>
                  <option value="Devam Ediyor">Devam Ediyor</option>
                  <option value="Tamamlandı">Tamamlandı</option>
                  <option value="İptal">İptal</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Başlık *</label>
              <input
                type="text"
                value={formData.baslik}
                onChange={(e) => setFormData({ ...formData, baslik: e.target.value })}
                className="input-macos"
                placeholder="Etkinlik başlığı"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi *</label>
                <input
                  type="date"
                  value={formData.baslangic_tarihi}
                  onChange={(e) => setFormData({ ...formData, baslangic_tarihi: e.target.value })}
                  className="input-macos"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Katılımcı Sayısı</label>
                <input
                  type="number"
                  value={formData.katilimci_sayisi}
                  onChange={(e) => setFormData({ ...formData, katilimci_sayisi: e.target.value })}
                  className="input-macos"
                  placeholder="100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yer</label>
              <input
                type="text"
                value={formData.yer}
                onChange={(e) => setFormData({ ...formData, yer: e.target.value })}
                className="input-macos"
                placeholder="Etkinlik yeri"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tahmini Bütçe (TL)</label>
              <input
                type="number"
                value={formData.tahmini_butce}
                onChange={(e) => setFormData({ ...formData, tahmini_butce: e.target.value })}
                className="input-macos"
                step="0.01"
                placeholder="0.00"
              />
            </div>
            
            <DialogFooter>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-macos-secondary"
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn-macos"
              >
                Güncelle
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-4">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Etkinlik ara..."
              className="flex-1"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="h-9 px-3 py-1 text-sm border rounded-md bg-background focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="Planlandı">Planlandı</option>
              <option value="Devam Ediyor">Devam Ediyor</option>
              <option value="Tamamlandı">Tamamlandı</option>
              <option value="İptal">İptal</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredEtkinlikler.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Etkinlik bulunamadı</div>
          ) : (
            <div className="space-y-3">
              {filteredEtkinlikler.map((etkinlik) => (
                <div
                  key={etkinlik.id}
                  className="border rounded-lg p-4 hover:border-primary hover:shadow-md transition-all"
                >
                  <div className="flex justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => navigate(`/etkinlikler/${etkinlik.id}`)}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{etkinlik.baslik}</h3>
                        <Badge variant={getDurumVariant(etkinlik.durum || 'Planlandı')}>
                          {etkinlik.durum || 'Planlandı'}
                        </Badge>
                        <Badge variant="secondary">
                          {etkinlik.etkinlik_tipi || 'DİĞER'}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(etkinlik.baslangic_tarihi).toLocaleDateString('tr-TR')}</span>
                        </div>
                        {etkinlik.yer && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>{etkinlik.yer}</span>
                          </div>
                        )}
                        {etkinlik.katilimci_sayisi && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{etkinlik.katilimci_sayisi} kişi</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-2">
                      {etkinlik.tahmini_butce && (
                        <div className="text-right">
                          <div className="text-sm text-primary font-medium">{etkinlik.tahmini_butce.toLocaleString()} TL</div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(etkinlik);
                          }}
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(etkinlik.id);
                          }}
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EtkinliklerListPage;
