import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2 } from 'lucide-react';

export type CellType = 'text' | 'number' | 'currency' | 'date' | 'select' | 'checkbox';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface EditableCellProps {
  /** Current value */
  value: string | number | boolean | null | undefined;
  /** Cell type */
  type?: CellType;
  /** Row ID - CRITICAL for correct updates */
  rowId: string;
  /** Column ID - CRITICAL for correct updates */
  columnId: string;
  /** Callback when value changes - receives rowId, columnId, value */
  onChange: (rowId: string, columnId: string, value: string | number | boolean | null) => void;
  /** Callback when save is triggered */
  onSave?: () => void;
  /** Callback when cancel is triggered */
  onCancel?: () => void;
  /** Callback for navigation */
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  /** Whether cell is currently being edited */
  isEditing?: boolean;
  /** Callback to start editing */
  onStartEdit?: () => void;
  /** Whether cell is editable */
  editable?: boolean;
  /** Whether cell is saving */
  isSaving?: boolean;
  /** Validation error */
  error?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Select options for select type */
  options?: SelectOption[];
  /** Currency symbol for currency type */
  currencySymbol?: string;
  /** Custom className */
  className?: string;
  /** Row index for navigation */
  rowIndex?: number;
  /** Column index for navigation */
  colIndex?: number;
  /** Format function for display */
  formatValue?: (value: any) => string;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type = 'text',
  rowId,
  columnId,
  onChange,
  onSave,
  onCancel,
  onNavigate,
  isEditing = false,
  onStartEdit,
  editable = true,
  isSaving = false,
  error,
  placeholder,
  options = [],
  currencySymbol = '₺',
  className,
  formatValue,
}) => {
  const [localValue, setLocalValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Sync local value when editing starts or value changes
  useEffect(() => {
    if (isEditing) {
      setLocalValue(formatForEdit(value));
    }
  }, [isEditing, value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      const timer = setTimeout(() => {
        if (type === 'select') {
          selectRef.current?.focus();
        } else {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isEditing, type]);

  // Format value for editing
  const formatForEdit = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (type === 'currency' || type === 'number') {
      return String(val).replace(/[^\d.-]/g, '');
    }
    if (type === 'date' && val) {
      // Convert to YYYY-MM-DD format for input
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    return String(val);
  };

  // Format value for display
  const formatForDisplay = (val: any): string => {
    if (formatValue) return formatValue(val);
    if (val === null || val === undefined || val === '') return '-';
    
    if (type === 'currency') {
      const num = parseFloat(String(val));
      if (isNaN(num)) return '-';
      return `${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol}`;
    }
    
    if (type === 'number') {
      const num = parseFloat(String(val));
      if (isNaN(num)) return '-';
      return num.toLocaleString('tr-TR');
    }
    
    if (type === 'date' && val) {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('tr-TR');
      }
    }
    
    if (type === 'select') {
      const option = options.find(opt => opt.value === val);
      return option?.label || String(val);
    }
    
    if (type === 'checkbox') {
      return val ? '✓' : '✗';
    }
    
    return String(val);
  };

  // Handle value change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
  };

  // Parse and save value - ALWAYS use current rowId/columnId from props!
  const handleSave = useCallback(() => {
    let parsedValue: string | number | boolean | null = localValue;
    
    if (type === 'number' || type === 'currency') {
      const num = parseFloat(localValue.replace(',', '.'));
      parsedValue = isNaN(num) ? null : num;
    } else if (type === 'checkbox') {
      parsedValue = localValue === 'true' || localValue === '1';
    } else if (localValue === '') {
      parsedValue = null;
    }
    
    // CRITICAL: Use rowId and columnId from current props, not from closure!
    console.log('[EditableCell] handleSave called with:', { rowId, columnId, parsedValue });
    onChange(rowId, columnId, parsedValue);
    onSave?.();
  }, [localValue, type, rowId, columnId, onChange, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setLocalValue(formatForEdit(value));
    onCancel?.();
  }, [value, onCancel]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (e.shiftKey) {
          handleSave();
          onNavigate?.('up');
        } else {
          handleSave();
          onNavigate?.('down');
        }
        break;
      case 'Tab':
        e.preventDefault();
        handleSave();
        if (e.shiftKey) {
          onNavigate?.('left');
        } else {
          onNavigate?.('right');
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleCancel();
        break;
      case 'ArrowUp':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSave();
          onNavigate?.('up');
        }
        break;
      case 'ArrowDown':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleSave();
          onNavigate?.('down');
        }
        break;
    }
  }, [handleSave, handleCancel, onNavigate]);

  // Handle click to start editing (single click for better UX)
  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (editable && !isEditing) {
      onStartEdit?.();
    }
  };

  // Handle single click (for checkbox - toggle immediately)
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'checkbox' && editable) {
      const newValue = !value;
      console.log('[EditableCell] Checkbox toggle:', { rowId, columnId, newValue });
      onChange(rowId, columnId, newValue);
      onSave?.();
    }
  };

  // Render editing state
  if (isEditing && editable) {
    if (type === 'select') {
      return (
        <div className={cn('relative', className)} onClick={(e) => e.stopPropagation()}>
          <select
            ref={selectRef}
            value={localValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setLocalValue(newValue);
              // Auto-save on select change
              let parsedValue: string | number | null = newValue;
              if (newValue === '') {
                parsedValue = null;
              }
              console.log('[EditableCell] Select change:', { rowId, columnId, parsedValue });
              onChange(rowId, columnId, parsedValue);
              onSave?.();
            }}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className={cn(
              'w-full px-2 py-1 text-sm rounded border',
              'bg-background border-accent focus:outline-none focus:ring-2 focus:ring-accent/50',
              error && 'border-destructive',
              isSaving && 'opacity-50'
            )}
          >
            <option value="">Seçiniz...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isSaving && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-accent" />
          )}
        </div>
      );
    }

    if (type === 'checkbox') {
      return (
        <div className={cn('flex items-center justify-center', className)}>
          <input
            type="checkbox"
            checked={localValue === 'true' || localValue === '1'}
            onChange={(e) => {
              onChange(rowId, columnId, e.target.checked);
              onSave?.();
            }}
            disabled={isSaving}
            className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
          />
        </div>
      );
    }

    return (
      <div className={cn('relative', className)}>
        <Input
          ref={inputRef}
          type={type === 'date' ? 'date' : type === 'number' || type === 'currency' ? 'text' : 'text'}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
          placeholder={placeholder}
          inputMode={type === 'number' || type === 'currency' ? 'decimal' : undefined}
          className={cn(
            'h-8 px-2 py-1 text-sm',
            error && 'border-destructive focus-visible:ring-destructive',
            isSaving && 'opacity-50',
            type === 'currency' && 'text-right'
          )}
        />
        {isSaving && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-accent" />
        )}
        {error && (
          <span className="absolute -bottom-5 left-0 text-xs text-destructive">{error}</span>
        )}
      </div>
    );
  }

  // Render display state
  return (
    <div
      className={cn(
        'px-2 py-1 min-h-[32px] flex items-center rounded',
        editable && 'cursor-pointer hover:bg-accent/10 border border-transparent hover:border-accent/30',
        type === 'currency' || type === 'number' ? 'justify-end font-mono' : 'justify-start',
        type === 'checkbox' && 'justify-center',
        error && 'bg-destructive/10',
        className
      )}
      onClick={type === 'checkbox' ? handleCheckboxClick : handleCellClick}
      title={editable ? 'Düzenlemek için tıklayın' : undefined}
    >
      <span className={cn(
        'text-sm truncate',
        (value === null || value === undefined || value === '') && 'text-foreground-tertiary'
      )}>
        {formatForDisplay(value)}
      </span>
    </div>
  );
};

export default EditableCell;
