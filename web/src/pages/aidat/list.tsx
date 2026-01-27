import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Plus, Pencil, Trash2, FileDown, Calendar, Wallet, AlertTriangle, CheckCircle,
  Grid3X3, List, ChevronLeft, ChevronRight, CreditCard, Users, TrendingUp, Eye
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PageLayout, GlassCard, SectionCard } from '@/components/ui/page-layout';
import { StatCard, StatIcons } from '@/components/ui/dashboard-widgets';
import { cn } from '@/lib/utils';

interface AidatTakip {
  id: string;
  uye_id: string;
  uye_ad_soyad?: string;
  yil: number;
  ay: number;
  tutar: number;
  odenen: number;
  odeme_tarihi?: string;
  gecikme_gun: number;
  gecikme_faiz: number;
  durum: string;
  created_at: string;
}

interface AidatOzet {
  toplam_tutar: number;
  toplam_odenen: number;
  toplam_kalan: number;
  odenen_adet: number;
  geciken_adet: number;
}

const aylar = [
  { value: 1, label: 'Ocak', short: 'Oca' },
  { value: 2, label: 'Şubat', short: 'Şub' },
  { value: 3, label: 'Mart', short: 'Mar' },
  { value: 4, label: 'Nisan', short: 'Nis' },
  { value: 5, label: 'Mayıs', short: 'May' },
  { value: 6, label: 'Haziran', short: 'Haz' },
  { value: 7, label: 'Temmuz', short: 'Tem' },
  { value: 8, label: 'Ağustos', short: 'Ağu' },
  { value: 9, label: 'Eylül', short: 'Eyl' },
  { value: 10, label: 'Ekim', short: 'Eki' },
  { value: 11, label: 'Kasım', short: 'Kas' },
  { value: 12, label: 'Aralık', short: 'Ara' },
];

// Calendar Month Card Component
const MonthCard: React.FC<{
  ay: number;
  yil: number;
  data: AidatTakip[];
  onClick: () => void;
}> = ({ ay, yil, data, onClick }) => {
  const monthData = data.filter(a => a.ay === ay);
  const toplam = monthData.reduce((sum, a) => sum + a.tutar, 0);
  const odenen = monthData.reduce((sum, a) => sum + a.odenen, 0);
  const kalan = toplam - odenen;
  const oran = toplam > 0 ? (odenen / toplam) * 100 : 0;

  const isPast = ay < new Date().getMonth() + 1 || yil < new Date().getFullYear();
  const isCurrent = ay === new Date().getMonth() + 1 && yil === new Date().getFullYear();

  const statusColor = oran >= 100 ? '#10b981' : oran >= 50 ? '#f59e0b' : oran > 0 ? '#ef4444' : '#94a3b8';

  return (
    <GlassCard
      className={cn(
        "p-4 cursor-pointer transition-all hover:scale-105",
        isCurrent && "ring-2 ring-blue-500"
      )}
      onClick={onClick}
      glow={statusColor}
      hover
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-800">{aylar[ay - 1]?.short}</span>
        {isCurrent && <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
      </div>

      {monthData.length > 0 ? (
        <>
          <div className="text-lg font-bold text-gray-800 mb-1">
            ₺{odenen.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            / ₺{toplam.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
          </div>
          <div className="h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(oran, 100)}%`,
                background: statusColor,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">{monthData.length} kayıt</span>
            <span style={{ color: statusColor }} className="font-medium">{oran.toFixed(0)}%</span>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <span className="text-gray-400 text-xs">{isPast ? 'Kayıt yok' : 'Bekliyor'}</span>
        </div>
      )}
    </GlassCard>
  );
};

import { useViewMode } from '@/store/viewModeStore';

export const AidatListPage: React.FC = () => {
  const navigate = useNavigate();
  const tenant = useAuthStore((state) => state.tenant);
  const { isSimple } = useViewMode();

  const [aidatlar, setAidatlar] = useState<AidatTakip[]>([]);
  const [ozet, setOzet] = useState<AidatOzet | null>(null);
  const [loading, setLoading] = useState(true);
  const [yil, setYil] = useState<number>(new Date().getFullYear());
  const [ay, setAy] = useState<number | ''>('');
  const [durum, setDurum] = useState<string>('');
  const [localViewMode, setLocalViewMode] = useState<'calendar' | 'list'>('calendar');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AidatTakip | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const viewMode = isSimple ? 'calendar' : localViewMode;
  const setViewMode = setLocalViewMode;

  React.useEffect(() => {
    if (!tenant) {
      setLoading(false);
      return;
    }
    loadAidatlar();
    loadOzet();
  }, [tenant, yil, ay, durum]);

  const loadAidatlar = async () => {
    if (!tenant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await invoke<AidatTakip[]>('get_aidat_takip', {
        tenantIdParam: tenant.id,
        filterUyeId: null,
        filterYil: yil,
        filterAy: ay === '' ? null : ay,
        filterDurum: durum || null,
        skip: 0,
        limit: 1000,
      });
      setAidatlar(result);
    } catch (error) {
      console.error('Failed to load aidatlar:', error);
      toast.error('Aidatlar yüklenemedi: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const loadOzet = async () => {
    if (!tenant) return;

    try {
      const result = await invoke<AidatOzet>('get_aidat_ozet', {
        tenantIdParam: tenant.id,
        yil,
      });
      setOzet(result);
    } catch (error) {
      console.error('Failed to load ozet:', error);
    }
  };

  const handleEdit = (aidat: AidatTakip) => {
    setEditingItem(aidat);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!tenant || !editingItem) return;

    try {
      await invoke('update_aidat_odeme', {
        tenantIdParam: tenant.id,
        odemeId: editingItem.id,
        tutar: editingItem.tutar,
        odenen: editingItem.odenen,
        odemeTarihi: editingItem.odeme_tarihi || null,
      });
      setShowEditModal(false);
      setEditingItem(null);
      loadAidatlar();
      loadOzet();
      toast.success('Aidat güncellendi');
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error('Güncelleme hatası: ' + error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenant) return;
    if (!confirm('Bu aidat kaydını silmek istediğinizden emin misiniz?')) return;

    try {
      await invoke('delete_aidat_odeme', {
        tenantIdParam: tenant.id,
        odemeId: id,
      });
      loadAidatlar();
      loadOzet();
      toast.success('Aidat kaydı silindi');
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Silme hatası: ' + error);
    }
  };

  // Filtered data for selected month
  const filteredAidatlar = useMemo(() => {
    if (selectedMonth === null) return aidatlar;
    return aidatlar.filter(a => a.ay === selectedMonth);
  }, [aidatlar, selectedMonth]);

  // Stats
  const tahsilatOrani = ozet && ozet.toplam_tutar > 0
    ? (ozet.toplam_odenen / ozet.toplam_tutar) * 100
    : 0;

  return (
    <PageLayout
      title="Aidat Takip"
      subtitle={`${yil} yılı aidat takibi`}
      icon={<CreditCard className="w-6 h-6" />}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/aidat/toplu-islemler')}>
            <Plus className="h-4 w-4 mr-2" />
            Toplu İşlem
          </Button>
          <Button onClick={() => navigate('/aidat/tanim')}>
            <CreditCard className="h-4 w-4 mr-2" />
            Aidat Tanım
          </Button>
        </div>
      }
      stats={
        <>
          <StatCard
            title="Toplam Tutar"
            value={`₺${(ozet?.toplam_tutar || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
            icon={StatIcons.wallet}
            color="blue"
            size="sm"
          />
          <StatCard
            title="Tahsil Edilen"
            value={`₺${(ozet?.toplam_odenen || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
            subtitle={`${tahsilatOrani.toFixed(1)}% tahsilat`}
            icon={StatIcons.check}
            color="green"
            size="sm"
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Kalan Alacak"
            value={`₺${(ozet?.toplam_kalan || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
            icon={StatIcons.alert}
            color="red"
            size="sm"
          />
          <StatCard
            title="Geciken"
            value={ozet?.geciken_adet || 0}
            subtitle="Ödeme bekliyor"
            icon={StatIcons.clock}
            color="yellow"
            size="sm"
          />
        </>
      }
    >
      {/* Controls */}
      <SectionCard className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Year Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setYil(yil - 1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-xl font-bold text-gray-800 min-w-[80px] text-center">{yil}</span>
              <button
                onClick={() => setYil(yil + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Filters */}
            <select
              value={durum}
              onChange={(e) => setDurum(e.target.value)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="odendi">Ödendi</option>
              <option value="kismi_odendi">Kısmi Ödendi</option>
              <option value="gecikti">Gecikti</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'calendar'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
                Takvim
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  viewMode === 'list'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <List className="w-4 h-4" />
                Liste
              </button>
            </div>

            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Dışa Aktar
            </Button>
          </div>
        </div>
      </SectionCard>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-4 mb-6">
          {aylar.map((a) => (
            <MonthCard
              key={a.value}
              ay={a.value}
              yil={yil}
              data={aidatlar}
              onClick={() => setSelectedMonth(selectedMonth === a.value ? null : a.value)}
            />
          ))}
        </div>
      )}

      {/* List / Detail View */}
      {(viewMode === 'list' || selectedMonth !== null) && (
        <SectionCard
          title={selectedMonth ? `${aylar[selectedMonth - 1]?.label} ${yil}` : `${yil} Yılı Aidatlar`}
          subtitle={`${filteredAidatlar.length} kayıt`}
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          actions={
            selectedMonth && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedMonth(null)}>
                Tümünü Göster
              </Button>
            )
          }
        >
          {loading ? (
            <div className="py-8 text-center text-gray-500">Yükleniyor...</div>
          ) : filteredAidatlar.length === 0 ? (
            <div className="py-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Bu dönem için aidat kaydı bulunamadı</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAidatlar.map((aidat) => {
                const kalan = aidat.tutar - aidat.odenen;
                const oran = aidat.tutar > 0 ? (aidat.odenen / aidat.tutar) * 100 : 0;

                const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
                  odendi: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Ödendi' },
                  kismi_odendi: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Kısmi' },
                  gecikti: { color: 'text-red-700', bg: 'bg-red-100', label: 'Gecikti' },
                  beklemede: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'Beklemede' },
                };
                const status = statusConfig[aidat.durum] || statusConfig.beklemede;

                return (
                  <div
                    key={aidat.id}
                    className="flex items-center gap-4 py-4 hover:bg-gray-50/50 px-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                    onClick={() => navigate(`/aidat/${aidat.id}`)}
                  >
                    {/* Month Badge */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{
                        background: `linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)`,
                      }}
                    >
                      {aylar[aidat.ay - 1]?.short}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {aidat.uye_ad_soyad || `Üye #${aidat.uye_id.slice(0, 8)}`}
                        </p>
                        <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", status.bg, status.color)}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {aylar[aidat.ay - 1]?.label} {aidat.yil}
                        {aidat.gecikme_gun > 0 && (
                          <span className="text-red-500 ml-2">• {aidat.gecikme_gun} gün gecikme</span>
                        )}
                      </p>
                    </div>

                    {/* Progress */}
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Ödeme</span>
                        <span className="font-medium">{oran.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          style={{ width: `${oran}%` }}
                        />
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">₺{aidat.odenen.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">/ ₺{aidat.tutar.toFixed(2)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(aidat); }}
                        className="p-2 rounded-lg hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(aidat.id); }}
                        className="p-2 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aidat Düzenle</DialogTitle>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Dönem</label>
                <Input
                  value={`${aylar[editingItem.ay - 1]?.label} ${editingItem.yil}`}
                  disabled
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Tutar (₺)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem.tutar}
                  onChange={(e) => setEditingItem({ ...editingItem, tutar: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Ödenen (₺)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editingItem.odenen}
                  onChange={(e) => setEditingItem({ ...editingItem, odenen: parseFloat(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Ödeme Tarihi</label>
                <Input
                  type="date"
                  value={editingItem.odeme_tarihi || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, odeme_tarihi: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdate}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default AidatListPage;
