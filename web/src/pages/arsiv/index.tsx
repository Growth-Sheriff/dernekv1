import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Archive,
  Search,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Trash2,
  Filter,
  FolderOpen,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Belge {
  id: string;
  tenant_id: string;
  belge_turu: string;
  baslik: string;
  dosya_adi: string;
  dosya_yolu: string;
  dosya_boyutu?: number;
  mime_type?: string;
  bagli_kayit_turu?: string;
  bagli_kayit_id?: string;
  aciklama?: string;
  etiketler?: string;
  resmi_durum?: string;
  created_at: string;
}

interface BelgeStats {
  toplam: number;
  resmi: number;
  gayri_resmi: number;
  turler: Record<string, number>;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
};

const getBelgeTuruLabel = (tur: string): string => {
  const labels: Record<string, string> = {
    gelir: 'Gelir Belgesi',
    gider: 'Gider Belgesi',
    vadeli_islem: 'Vadeli İşlem',
    demirbas: 'Demirbaş',
    sozlesme: 'Sözleşme',
    fatura: 'Fatura',
    dekont: 'Dekont',
    genel: 'Genel',
  };
  return labels[tur] || tur;
};

export const ArsivPage: React.FC = () => {
  console.log('🗂️ ArsivPage render başladı');
  const tenant = useAuthStore((state) => state.tenant);
  console.log('🗂️ Tenant:', tenant);
  const [belgeler, setBelgeler] = useState<Belge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTur, setFilterTur] = useState<string>('');
  const [filterResmi, setFilterResmi] = useState<string>('');
  const [stats, setStats] = useState<BelgeStats | null>(null);
  const [selectedBelge, setSelectedBelge] = useState<Belge | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (tenant) {
      loadBelgeler();
    }
  }, [tenant, filterTur, filterResmi]);

  const loadBelgeler = async () => {
    if (!tenant) return;

    try {
      setLoading(true);
      const result = await invoke<Belge[]>('get_belgeler', {
        tenantIdParam: tenant.id,
        belge_turu: filterTur || null,
        bagli_kayit_turu: null,
        bagli_kayit_id: null,
        skip: 0,
        limit: 500,
      });

      // Client-side filtering for resmi_durum
      let filtered = result;
      if (filterResmi) {
        filtered = result.filter((b) => b.resmi_durum === filterResmi);
      }

      setBelgeler(filtered);

      // Calculate stats
      const turCounts: Record<string, number> = {};
      result.forEach((b) => {
        turCounts[b.belge_turu] = (turCounts[b.belge_turu] || 0) + 1;
      });

      setStats({
        toplam: result.length,
        resmi: result.filter((b) => b.resmi_durum === 'resmi').length,
        gayri_resmi: result.filter((b) => b.resmi_durum === 'gayri_resmi').length,
        turler: turCounts,
      });
    } catch (error) {
      console.error('Belgeler yüklenemedi:', error);
      toast.error('Belgeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (belge: Belge) => {
    try {
      const result = await invoke<{ dosya_adi: string; base64_data: string }>('download_belge', {
        tenantIdParam: tenant!.id,
        belgeId: belge.id,
      });

      // Create download link
      const link = document.createElement('a');
      link.href = `data:${belge.mime_type || 'application/octet-stream'};base64,${result.base64_data}`;
      link.download = result.dosya_adi;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Dosya indirildi');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Dosya indirilemedi');
    }
  };

  const handleDelete = async (belge: Belge) => {
    if (!window.confirm(`"${belge.baslik}" belgesini silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      await invoke('delete_belge', {
        tenantIdParam: tenant!.id,
        belgeId: belge.id,
      });
      toast.success('Belge silindi');
      loadBelgeler();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Belge silinemedi');
    }
  };

  const filteredBelgeler = belgeler.filter((b) =>
    b.baslik.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.dosya_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.aciklama && b.aciklama.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Tenant yoksa uyarı göster
  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Oturum bulunamadı</p>
          <p className="text-sm text-muted-foreground mt-1">Lütfen giriş yapın</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arşiv"
        description="Tüm belge ve evrakların merkezi yönetimi"
        icon={Archive}
      />

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FolderOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Belge</p>
                <p className="text-2xl font-bold">{stats?.toplam || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resmi Belgeler</p>
                <p className="text-2xl font-bold">{stats?.resmi || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <XCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gayri Resmi</p>
                <p className="text-2xl font-bold">{stats?.gayri_resmi || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Belge Türü</p>
                <p className="text-2xl font-bold">{Object.keys(stats?.turler || {}).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Belge ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterTur || 'all'} onValueChange={(v) => setFilterTur(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Belge Türü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="gelir">Gelir Belgesi</SelectItem>
                <SelectItem value="gider">Gider Belgesi</SelectItem>
                <SelectItem value="vadeli_islem">Vadeli İşlem</SelectItem>
                <SelectItem value="demirbas">Demirbaş</SelectItem>
                <SelectItem value="sozlesme">Sözleşme</SelectItem>
                <SelectItem value="fatura">Fatura</SelectItem>
                <SelectItem value="dekont">Dekont</SelectItem>
                <SelectItem value="genel">Genel</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterResmi || 'all'} onValueChange={(v) => setFilterResmi(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Resmi Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="resmi">Resmi</SelectItem>
                <SelectItem value="gayri_resmi">Gayri Resmi</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => { setSearchTerm(''); setFilterTur(''); setFilterResmi(''); }}>
              <Filter className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Belge Listesi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Belgeler ({filteredBelgeler.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredBelgeler.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Belge bulunamadı</p>
              <p className="text-sm text-muted-foreground mt-1">
                Aramayı genişletin veya filtreleri temizleyin
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBelgeler.map((belge) => (
                  <TableRow key={belge.id}>
                    <TableCell>{getFileIcon(belge.mime_type)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{belge.baslik}</p>
                        <p className="text-sm text-muted-foreground">{belge.dosya_adi}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBelgeTuruLabel(belge.belge_turu)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={belge.resmi_durum === 'resmi' ? 'default' : 'secondary'}>
                        {belge.resmi_durum === 'resmi' ? '📋 Resmi' : '📄 Gayri Resmi'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(belge.dosya_boyutu)}</TableCell>
                    <TableCell>{formatDate(belge.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBelge(belge);
                            setShowPreview(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(belge)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(belge)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Belge Önizleme Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon(selectedBelge?.mime_type)}
              {selectedBelge?.baslik}
            </DialogTitle>
          </DialogHeader>
          {selectedBelge && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Dosya Adı:</span>
                  <p className="font-medium">{selectedBelge.dosya_adi}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Boyut:</span>
                  <p className="font-medium">{formatFileSize(selectedBelge.dosya_boyutu)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Belge Türü:</span>
                  <p className="font-medium">{getBelgeTuruLabel(selectedBelge.belge_turu)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Resmi Durum:</span>
                  <Badge variant={selectedBelge.resmi_durum === 'resmi' ? 'default' : 'secondary'}>
                    {selectedBelge.resmi_durum === 'resmi' ? '📋 Resmi' : '📄 Gayri Resmi'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Yükleme Tarihi:</span>
                  <p className="font-medium">{formatDate(selectedBelge.created_at)}</p>
                </div>
                {selectedBelge.bagli_kayit_turu && (
                  <div>
                    <span className="text-muted-foreground">Bağlı Kayıt:</span>
                    <p className="font-medium">{selectedBelge.bagli_kayit_turu}</p>
                  </div>
                )}
              </div>
              {selectedBelge.aciklama && (
                <div>
                  <span className="text-sm text-muted-foreground">Açıklama:</span>
                  <p className="mt-1">{selectedBelge.aciklama}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Kapat
                </Button>
                <Button onClick={() => handleDownload(selectedBelge)}>
                  <Download className="h-4 w-4 mr-2" />
                  İndir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArsivPage;
