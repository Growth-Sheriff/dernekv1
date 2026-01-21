import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { ColumnDefinition, ColumnConfig, ColumnPresetConfig } from '@/types/columnConfig';

interface ColumnSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDefinition[];
  currentConfig: ColumnConfig;
  onSave: (config: ColumnConfig) => Promise<void>;
  onReset: () => Promise<void>;
  presets?: ColumnPresetConfig[];
}

export const ColumnSettingsModal: React.FC<ColumnSettingsModalProps> = ({
  open,
  onOpenChange,
  columns,
  currentConfig,
  onSave,
  onReset,
  presets = [],
}) => {
  const [localConfig, setLocalConfig] = useState<ColumnConfig>(currentConfig);
  const [isSaving, setIsSaving] = useState(false);

  // Modal açıldığında config'i senkronize et
  useEffect(() => {
    if (open) {
      setLocalConfig(currentConfig);
    }
  }, [open, currentConfig]);

  const handleToggleColumn = (columnId: string) => {
    const col = columns.find(c => c.id === columnId);

    // Zorunlu sütunlar gizlenemez
    if (col?.required) return;

    const isVisible = localConfig.visible.includes(columnId);

    if (isVisible) {
      // Kaldır
      setLocalConfig({
        ...localConfig,
        visible: localConfig.visible.filter(id => id !== columnId),
      });
    } else {
      // Ekle
      setLocalConfig({
        ...localConfig,
        visible: [...localConfig.visible, columnId],
      });
    }
  };

  const handleMoveColumn = (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = localConfig.order.indexOf(columnId);
    if (currentIndex === -1) return;

    const newOrder = [...localConfig.order];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap
    [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]];

    setLocalConfig({
      ...localConfig,
      order: newOrder,
    });
  };

  const handleApplyPreset = (preset: ColumnPresetConfig) => {
    setLocalConfig({
      ...localConfig,
      visible: preset.visibleColumns,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(localConfig);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save column config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await onReset();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to reset column config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Order'a göre sıralanmış sütunlar
  const orderedColumns = localConfig.order
    .map(id => columns.find(col => col.id === id))
    .filter((col): col is ColumnDefinition => col !== undefined);

  const visibleCount = localConfig.visible.length;
  const totalCount = columns.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Sütun Ayarları</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Görüntülemek istediğiniz sütunları seçin ve sıralayın
          </p>
        </DialogHeader>

        {/* Presets */}
        {presets.length > 0 && (
          <div className="border-b pb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Hızlı Görünümler</label>
            <div className="flex gap-2 flex-wrap">
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Sütun Listesi */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          <div className="bg-gray-50 px-4 py-2 border-b sticky top-0">
            <div className="text-sm font-medium text-gray-700">
              {visibleCount} / {totalCount} sütun görünür
            </div>
          </div>

          <div className="divide-y">
            {orderedColumns.map((column, index) => {
              const isVisible = localConfig.visible.includes(column.id);
              const isRequired = column.required;

              return (
                <div
                  key={column.id}
                  className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                    !isVisible ? 'opacity-50' : ''
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveColumn(column.id, 'up')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Yukarı taşı"
                    >
                      <GripVertical className="w-3 h-3 text-gray-400 rotate-180" />
                    </button>
                    <button
                      onClick={() => handleMoveColumn(column.id, 'down')}
                      disabled={index === orderedColumns.length - 1}
                      className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Aşağı taşı"
                    >
                      <GripVertical className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>

                  {/* Checkbox */}
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => handleToggleColumn(column.id)}
                    disabled={isRequired}
                    className="data-[state=checked]:bg-blue-600"
                  />

                  {/* Icon */}
                  <div>
                    {isVisible ? (
                      <Eye className="w-4 h-4 text-blue-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{column.label}</div>
                    {isRequired && (
                      <div className="text-xs text-gray-500">Zorunlu sütun</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sıfırla</span>
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
