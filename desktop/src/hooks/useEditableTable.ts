import { useState, useCallback, useMemo } from 'react';
import { CellType } from '@/components/common/editable-cell';

// =====================================================
// ID-BASED CELL POSITION (not index based!)
// =====================================================
export interface CellPosition {
  rowId: string;    // Unique row identifier
  columnId: string; // Column field name
}

export interface CellChange<T = any> {
  rowId: string;
  field: string;
  oldValue: any;
  newValue: any;
  row: T;
}

export interface EditableColumnConfig {
  id: string;
  type?: CellType;
  editable?: boolean;
  validate?: (value: any, row: any) => string | null;
  options?: { value: string | number; label: string }[];
}

export interface UseEditableTableOptions<T> {
  /** Data array */
  data: T[];
  /** Column configurations */
  columns: EditableColumnConfig[];
  /** Get row ID from row data */
  getRowId: (row: T) => string;
  /** Callback when a cell value changes */
  onCellChange?: (change: CellChange<T>) => void | Promise<void>;
  /** Callback when save is triggered */
  onSave?: (changes: CellChange<T>[]) => void | Promise<void>;
  /** Auto-save on cell change */
  autoSave?: boolean;
  /** Batch mode - collect changes and save all at once */
  batchMode?: boolean;
}

export interface UseEditableTableReturn<T> {
  /** Currently editing cell position (ID based) */
  editingCell: CellPosition | null;
  /** Start editing a cell */
  startEditing: (rowId: string, columnId: string) => void;
  /** Stop editing current cell */
  stopEditing: () => void;
  /** Check if a cell is being edited */
  isEditing: (rowId: string, columnId: string) => boolean;
  /** Handle cell value change */
  handleCellChange: (rowId: string, columnId: string, value: any) => void;
  /** Navigate to next/prev cell */
  navigate: (direction: 'up' | 'down' | 'left' | 'right', currentRowIndex: number) => void;
  /** Pending changes */
  pendingChanges: CellChange<T>[];
  /** Clear pending changes */
  clearPendingChanges: () => void;
  /** Save all pending changes */
  saveChanges: () => Promise<void>;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Current saving state */
  isSaving: boolean;
  /** Current saving cell */
  savingCell: CellPosition | null;
  /** Cell errors */
  cellErrors: Map<string, string>;
  /** Get cell error */
  getCellError: (rowId: string, columnId: string) => string | undefined;
  /** Modified data with pending changes applied */
  modifiedData: T[];
  /** Editable column IDs */
  editableColumnIds: string[];
}

export function useEditableTable<T extends Record<string, any>>({
  data,
  columns,
  getRowId,
  onCellChange,
  onSave,
  autoSave = true,
  batchMode = false,
}: UseEditableTableOptions<T>): UseEditableTableReturn<T> {
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null);
  const [pendingChanges, setPendingChanges] = useState<CellChange<T>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingCell, setSavingCell] = useState<CellPosition | null>(null);
  const [cellErrors, setCellErrors] = useState<Map<string, string>>(new Map());
  
  // Track editable column IDs (not indices!)
  const editableColumnIds = useMemo(() => {
    return columns
      .filter(col => col.editable !== false)
      .map(col => col.id);
  }, [columns]);

  // Create a map for quick column lookup by ID
  const columnMap = useMemo(() => {
    return new Map(columns.map(col => [col.id, col]));
  }, [columns]);

  // Apply pending changes to data
  const modifiedData = useMemo(() => {
    if (pendingChanges.length === 0) return data;
    
    // Build a map of changes: rowId -> { field: newValue }
    const changeMap = new Map<string, Map<string, any>>();
    for (const change of pendingChanges) {
      if (!changeMap.has(change.rowId)) {
        changeMap.set(change.rowId, new Map());
      }
      changeMap.get(change.rowId)!.set(change.field, change.newValue);
    }
    
    return data.map(row => {
      const rowId = getRowId(row);
      const rowChanges = changeMap.get(rowId);
      if (!rowChanges) return row;
      
      const modified = { ...row };
      rowChanges.forEach((value, field) => {
        modified[field as keyof T] = value;
      });
      return modified;
    });
  }, [data, pendingChanges, getRowId]);

  // Generate cell key for error tracking (ID based)
  const getCellKey = (rowId: string, columnId: string): string => {
    return `${rowId}::${columnId}`;
  };

  // Start editing a cell (ID based)
  const startEditing = useCallback((rowId: string, columnId: string) => {
    console.log('='.repeat(60));
    console.log('[useEditableTable] startEditing CALLED');
    console.log('[useEditableTable] rowId:', rowId, 'type:', typeof rowId);
    console.log('[useEditableTable] columnId:', columnId, 'type:', typeof columnId);
    
    const column = columnMap.get(columnId);
    if (!column || column.editable === false) {
      console.log('[useEditableTable] Cannot edit - column not editable:', columnId);
      return;
    }
    
    console.log('[useEditableTable] Setting editingCell to:', { rowId, columnId });
    setEditingCell({ rowId, columnId });
  }, [columnMap]);

  // Stop editing
  const stopEditing = useCallback(() => {
    console.log('[useEditableTable] Stopping edit');
    setEditingCell(null);
  }, []);

  // Check if a cell is being edited (ID based)
  const isEditing = useCallback((rowId: string, columnId: string): boolean => {
    return editingCell?.rowId === rowId && editingCell?.columnId === columnId;
  }, [editingCell]);

  // Handle cell value change (ID based - CRITICAL FIX)
  const handleCellChange = useCallback(async (
    rowId: string,
    columnId: string,
    value: any
  ) => {
    console.log('='.repeat(60));
    console.log('[useEditableTable] handleCellChange CALLED');
    console.log('[useEditableTable] Input params:', { rowId, columnId, value });
    console.log('[useEditableTable] rowId type:', typeof rowId);
    console.log('[useEditableTable] columnId type:', typeof columnId);
    
    const column = columnMap.get(columnId);
    if (!column) {
      console.warn('[useEditableTable] Column not found:', columnId);
      return;
    }

    // Find the row by ID - NOT by index! This is the critical fix.
    console.log('[useEditableTable] Searching for row with ID:', rowId);
    console.log('[useEditableTable] modifiedData length:', modifiedData.length);
    console.log('[useEditableTable] First 3 rows IDs:', modifiedData.slice(0, 3).map(r => getRowId(r)));
    
    const currentRow = modifiedData.find(r => getRowId(r) === rowId);
    if (!currentRow) {
      console.warn('[useEditableTable] Row NOT FOUND! rowId:', rowId);
      console.warn('[useEditableTable] Available row IDs:', modifiedData.map(r => getRowId(r)));
      return;
    }

    console.log('[useEditableTable] Found row:', currentRow);
    const field = column.id;
    const oldValue = currentRow[field];
    
    console.log('[useEditableTable] Change details:', { rowId, field, oldValue, newValue: value });

    // Skip if value hasn't changed
    if (oldValue === value) {
      console.log('[useEditableTable] Value unchanged, skipping');
      stopEditing();
      return;
    }

    // Validate
    if (column.validate) {
      const error = column.validate(value, currentRow);
      if (error) {
        console.log('[useEditableTable] Validation failed:', error);
        setCellErrors(prev => new Map(prev).set(getCellKey(rowId, columnId), error));
        return;
      }
    }

    // Clear error
    setCellErrors(prev => {
      const next = new Map(prev);
      next.delete(getCellKey(rowId, columnId));
      return next;
    });

    const change: CellChange<T> = {
      rowId,
      field,
      oldValue,
      newValue: value,
      row: { ...currentRow, [field]: value } as T,
    };

    console.log('[useEditableTable] Created change object:', change);

    if (batchMode) {
      // Add to pending changes
      setPendingChanges(prev => {
        const filtered = prev.filter(c => !(c.rowId === rowId && c.field === field));
        return [...filtered, change];
      });
    } else if (autoSave && onCellChange) {
      // Auto-save immediately
      setSavingCell({ rowId, columnId });
      setIsSaving(true);
      try {
        console.log('[useEditableTable] Auto-saving...');
        await onCellChange(change);
        console.log('[useEditableTable] Auto-save complete');
      } catch (error) {
        console.error('[useEditableTable] Auto-save error:', error);
        setCellErrors(prev => new Map(prev).set(
          getCellKey(rowId, columnId),
          error instanceof Error ? error.message : 'Kaydetme hatası'
        ));
      } finally {
        setIsSaving(false);
        setSavingCell(null);
      }
    } else {
      // Just track the change
      setPendingChanges(prev => {
        const filtered = prev.filter(c => !(c.rowId === rowId && c.field === field));
        return [...filtered, change];
      });
    }

    stopEditing();
  }, [columnMap, modifiedData, getRowId, batchMode, autoSave, onCellChange, stopEditing]);

  // Navigate to adjacent cell (needs visual index for row navigation)
  const navigate = useCallback((
    direction: 'up' | 'down' | 'left' | 'right',
    currentRowIndex: number
  ) => {
    if (!editingCell) return;
    
    const { columnId } = editingCell;
    const currentColumnIndex = editableColumnIds.indexOf(columnId);
    
    if (currentColumnIndex === -1) return;

    let newRowIndex = currentRowIndex;
    let newColumnIndex = currentColumnIndex;

    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, currentRowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(modifiedData.length - 1, currentRowIndex + 1);
        break;
      case 'left':
        if (currentColumnIndex > 0) {
          newColumnIndex = currentColumnIndex - 1;
        } else if (currentRowIndex > 0) {
          newRowIndex = currentRowIndex - 1;
          newColumnIndex = editableColumnIds.length - 1;
        }
        break;
      case 'right':
        if (currentColumnIndex < editableColumnIds.length - 1) {
          newColumnIndex = currentColumnIndex + 1;
        } else if (currentRowIndex < modifiedData.length - 1) {
          newRowIndex = currentRowIndex + 1;
          newColumnIndex = 0;
        }
        break;
    }

    if (newRowIndex !== currentRowIndex || newColumnIndex !== currentColumnIndex) {
      const newRow = modifiedData[newRowIndex];
      if (newRow) {
        const newRowId = getRowId(newRow);
        const newColumnId = editableColumnIds[newColumnIndex];
        startEditing(newRowId, newColumnId);
      }
    }
  }, [editingCell, editableColumnIds, modifiedData, getRowId, startEditing]);

  // Save all pending changes
  const saveChanges = useCallback(async () => {
    if (pendingChanges.length === 0 || !onSave) return;

    setIsSaving(true);
    try {
      await onSave(pendingChanges);
      setPendingChanges([]);
      setCellErrors(new Map());
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, onSave]);

  // Clear pending changes
  const clearPendingChanges = useCallback(() => {
    setPendingChanges([]);
    setCellErrors(new Map());
  }, []);

  // Get cell error (ID based)
  const getCellError = useCallback((rowId: string, columnId: string): string | undefined => {
    return cellErrors.get(getCellKey(rowId, columnId));
  }, [cellErrors]);

  return {
    editingCell,
    startEditing,
    stopEditing,
    isEditing,
    handleCellChange,
    navigate,
    pendingChanges,
    clearPendingChanges,
    saveChanges,
    hasChanges: pendingChanges.length > 0,
    isSaving,
    savingCell,
    cellErrors,
    getCellError,
    modifiedData,
    editableColumnIds,
  };
}

export default useEditableTable;
