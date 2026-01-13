import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { toast } from 'sonner';

export interface EvrakData {
  belge_id?: string;
  dosya_adi?: string;
  dosya_yolu?: string;
  dosya_boyutu?: number;
  mime_type?: string;
  resmi_durum?: 'resmi' | 'gayri_resmi';
}

interface EvrakEklemeProps {
  onEvrakChange: (evrak: EvrakData | null) => void;
  initialEvrak?: EvrakData;
  belgeTuru?: string;
  tenantId: string;
  disabled?: boolean;
}

const getMimeType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return <File className="h-8 w-8 text-muted-foreground" />;
  if (mimeType.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
  return <FileText className="h-8 w-8 text-muted-foreground" />;
};

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

export function EvrakEkleme({
  onEvrakChange,
  initialEvrak,
  belgeTuru = 'genel',
  tenantId,
  disabled = false,
}: EvrakEklemeProps) {
  const [evrak, setEvrak] = useState<EvrakData | null>(initialEvrak || null);
  const [aciklama, setAciklama] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDosyaSec = async () => {
    if (disabled) return;
    
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Belgeler',
            extensions: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        setLoading(true);
        
        const fileName = selected.split('/').pop() || selected.split('\\').pop() || 'dosya';
        const mimeType = getMimeType(fileName);

        const newEvrak: EvrakData = {
          dosya_adi: fileName,
          dosya_yolu: selected,
          dosya_boyutu: 0,
          mime_type: mimeType,
          resmi_durum: evrak?.resmi_durum || 'gayri_resmi',
        };

        setEvrak(newEvrak);
        onEvrakChange(newEvrak);
        
        toast.success(`${fileName} başarıyla seçildi.`);
      }
    } catch (error) {
      console.error('Dosya seçme hatası:', error);
      toast.error('Dosya seçilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResmiDurumChange = (value: string) => {
    const resmiDurum = value as 'resmi' | 'gayri_resmi';
    const updatedEvrak = evrak ? { ...evrak, resmi_durum: resmiDurum } : { resmi_durum: resmiDurum };
    setEvrak(updatedEvrak);
    onEvrakChange(updatedEvrak);
  };

  const handleKaldir = () => {
    setEvrak(null);
    setAciklama('');
    onEvrakChange(null);
  };

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Evrak / Belge</Label>
          <Select
            value={evrak?.resmi_durum || 'gayri_resmi'}
            onValueChange={handleResmiDurumChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Belge durumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resmi">Resmi</SelectItem>
              <SelectItem value="gayri_resmi">Gayri Resmi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {evrak?.dosya_adi ? (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            {getFileIcon(evrak.mime_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{evrak.dosya_adi}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(evrak.dosya_boyutu)} • {evrak.resmi_durum === 'resmi' ? '📋 Resmi' : '📄 Gayri Resmi'}
              </p>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleKaldir}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full h-20 border-dashed flex flex-col gap-1"
            onClick={handleDosyaSec}
            disabled={disabled || loading}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {loading ? 'Dosya yükleniyor...' : 'Dosya seçmek için tıklayın'}
            </span>
          </Button>
        )}

        {evrak?.dosya_adi && (
          <Textarea
            placeholder="Belge açıklaması (opsiyonel)"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            rows={2}
            className="text-sm"
            disabled={disabled}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default EvrakEkleme;
