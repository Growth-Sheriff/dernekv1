import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  VisibilityState,
  ColumnResizeMode,
  Row,
  Table,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
import { EditableCell, CellType, SelectOption } from './editable-cell';
import { useEditableTable, CellChange, EditableColumnConfig, CellPosition } from '@/hooks/useEditableTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileQuestion,
  Settings2,
  RotateCcw,
  Save,
  X,
  Loader2,
  GripVertical,
} from 'lucide-react';

const STORAGE_KEY_PREFIX = 'bader_editable_column_';

// Table meta type for sharing editing state - ID BASED!
interface TableMeta<TData> {
  editingCell: CellPosition | null;  // { rowId, columnId }
  savingCell: CellPosition | null;   // { rowId, columnId }
  startEditing: (rowId: string, columnId: string) => void;
  stopEditing: () => void;
  handleCellChange: (rowId: string, columnId: string, value: any) => void;
  navigate: (direction: 'up' | 'down' | 'left' | 'right', currentRowIndex: number) => void;
  getCellError: (rowId: string, columnId: string) => string | undefined;
  getRowId: (row: TData) => string;
}

export interface EditableColumnDef<TData> {
  /** Column ID (field name) */
  id: string;
  /** Column header */
  header: string;
  /** Cell type for editing */
  type?: CellType;
  /** Whether column is editable */
  editable?: boolean;
  /** Column width */
  width?: number;
  /** Min width */
  minWidth?: number;
  /** Max width */
  maxWidth?: number;
  /** Whether column can be hidden */
  canHide?: boolean;
  /** Whether column can be sorted */
  canSort?: boolean;
  /** Whether column can be resized */
  canResize?: boolean;
  /** Validation function */
  validate?: (value: any, row: TData) => string | null;
  /** Select options for select type */
  options?: SelectOption[];
  /** Custom cell renderer (for non-editable display) */
  cell?: (row: TData) => React.ReactNode;
  /** Format function for display */
  formatValue?: (value: any) => string;
  /** Accessor function to get value from row */
  accessorFn?: (row: TData) => any;
}

export interface EditableDataTableProps<TData extends Record<string, any>> {
  /** Column definitions */
  columns: EditableColumnDef<TData>[];
  /** Data array */
  data: TData[];
  /** Get row ID from row data */
  getRowId: (row: TData) => string;
  /** Loading state */
  loading?: boolean;
  /** Callback when a cell value changes */
  onCellChange?: (change: CellChange<TData>) => void | Promise<void>;
  /** Callback when batch save is triggered */
  onSave?: (changes: CellChange<TData>[]) => void | Promise<void>;
  /** Auto-save on cell change */
  autoSave?: boolean;
  /** Batch mode - show save/cancel buttons */
  batchMode?: boolean;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Empty message */
  emptyMessage?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Pagination config */
  pagination?: {
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  /** Toolbar content */
  toolbar?: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Hide search bar */
  hideSearch?: boolean;
  /** Hide pagination */
  hidePagination?: boolean;
  /** Unique table ID for localStorage persistence */
  tableId?: string;
  /** Default column visibility state */
  defaultColumnVisibility?: VisibilityState;
  /** Show column visibility toggle button */
  showColumnToggle?: boolean;
  /** Enable column resizing */
  enableColumnResize?: boolean;
  /** Row click callback */
  onRowClick?: (row: TData) => void;
  /** Add new row callback */
  onAddRow?: () => void;
  /** Add row button text */
  addRowText?: string;
}

export function EditableDataTable<TData extends Record<string, any>>({
  columns,
  data,
  getRowId,
  loading = false,
  onCellChange,
  onSave,
  autoSave = true,
  batchMode = false,
  emptyState,
  emptyMessage,
  searchPlaceholder = 'Ara...',
  pagination = { pageSize: 20, pageSizeOptions: [10, 20, 50, 100] },
  toolbar,
  className,
  hideSearch = false,
  hidePagination = false,
  tableId,
  defaultColumnVisibility = {},
  showColumnToggle = true,
  enableColumnResize = true,
  onRowClick,
  onAddRow,
  addRowText = 'Yeni Satır',
}: EditableDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  // Load column visibility and widths from localStorage
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (tableId) {
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tableId}_visibility`);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return defaultColumnVisibility;
  });

  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => {
    if (tableId) {
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tableId}_sizing`);
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return {};
  });

  // Save to localStorage when visibility/sizing changes
  useEffect(() => {
    if (tableId && Object.keys(columnVisibility).length > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${tableId}_visibility`, JSON.stringify(columnVisibility));
    }
  }, [tableId, columnVisibility]);

  useEffect(() => {
    if (tableId && Object.keys(columnSizing).length > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${tableId}_sizing`, JSON.stringify(columnSizing));
    }
  }, [tableId, columnSizing]);

  // Convert EditableColumnDef to EditableColumnConfig for hook
  const editableColumnConfigs: EditableColumnConfig[] = useMemo(() => {
    return columns.map(col => ({
      id: col.id,
      type: col.type,
      editable: col.editable,
      validate: col.validate,
      options: col.options,
    }));
  }, [columns]);

  // Use editable table hook
  const {
    editingCell,
    startEditing,
    stopEditing,
    isEditing,
    handleCellChange,
    navigate,
    pendingChanges,
    clearPendingChanges,
    saveChanges,
    hasChanges,
    isSaving,
    savingCell,
    getCellError,
    modifiedData,
  } = useEditableTable({
    data,
    columns: editableColumnConfigs,
    getRowId,
    onCellChange,
    onSave,
    autoSave,
    batchMode,
  });

  // Table meta for sharing editing state with cells
  const tableMeta = useMemo<TableMeta<TData>>(() => ({
    editingCell,
    savingCell,
    startEditing,
    stopEditing,
    handleCellChange,
    navigate,
    getCellError,
    getRowId,
  }), [editingCell, savingCell, startEditing, stopEditing, handleCellChange, navigate, getCellError, getRowId]);

  // Convert EditableColumnDef to TanStack ColumnDef
  // Cell render function uses ID-based state (not index!)
  const tableColumns: ColumnDef<TData>[] = useMemo(() => {
    return columns.map((col) => ({
      id: col.id,
      accessorFn: col.accessorFn || ((row: TData) => row[col.id]),
      header: () => (
        <div className="flex items-center gap-2">
          {col.header}
        </div>
      ),
      cell: ({ row, table }) => {
        // Get meta from table - this is reactive because table re-renders when meta changes
        const meta = table.options.meta as TableMeta<TData> | undefined;
        if (!meta) return null;
        
        // USE ROW ID, NOT INDEX! This is critical for sorting/filtering
        const rowId = meta.getRowId(row.original);
        const columnId = col.id;
        const rowIndex = row.index; // Only for navigation
        const value = col.accessorFn ? col.accessorFn(row.original) : row.original[col.id];
        
        // Compare by ID, not by index
        const cellIsEditing = meta.editingCell?.rowId === rowId && meta.editingCell?.columnId === columnId;
        const cellIsSaving = meta.savingCell?.rowId === rowId && meta.savingCell?.columnId === columnId;
        const error = meta.getCellError(rowId, columnId);

        // If column has custom cell renderer and is not editable
        if (col.cell && col.editable === false) {
          return col.cell(row.original);
        }

        return (
          <EditableCell
            key={`cell-${rowId}-${columnId}`}
            value={value}
            type={col.type}
            rowId={rowId}
            columnId={columnId}
            editable={col.editable !== false}
            isEditing={cellIsEditing}
            isSaving={cellIsSaving}
            error={error}
            options={col.options}
            formatValue={col.formatValue}
            rowIndex={rowIndex}
            colIndex={columns.findIndex(c => c.id === columnId)}
            onStartEdit={() => {
              console.log('[Cell] Starting edit:', { rowId, columnId });
              meta.startEditing(rowId, columnId);
            }}
            onChange={(cellRowId: string, cellColumnId: string, newValue: any) => {
              // CRITICAL: Use the rowId/columnId passed from EditableCell, not from closure!
              console.log('[Cell] Cell change from EditableCell:', { cellRowId, cellColumnId, newValue });
              meta.handleCellChange(cellRowId, cellColumnId, newValue);
            }}
            onSave={() => meta.stopEditing()}
            onCancel={() => meta.stopEditing()}
            onNavigate={(direction) => meta.navigate(direction, rowIndex)}
          />
        );
      },
      enableSorting: col.canSort !== false,
      enableHiding: col.canHide !== false,
      enableResizing: col.canResize !== false,
      size: col.width || 150,
      minSize: col.minWidth || 50,
      maxSize: col.maxWidth || 500,
    }));
  }, [columns]);

  const table = useReactTable({
    data: modifiedData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode,
    globalFilterFn: 'includesString',
    meta: tableMeta, // Pass meta to table
    state: {
      sorting,
      columnVisibility,
      globalFilter,
      columnSizing,
    },
    initialState: {
      pagination: {
        pageSize: pagination.pageSize || 20,
      },
    },
  });

  // Handle keyboard shortcuts at table level
  const handleTableKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl+S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's' && batchMode && hasChanges) {
      e.preventDefault();
      saveChanges();
    }
    // Escape to cancel
    if (e.key === 'Escape' && batchMode && hasChanges) {
      clearPendingChanges();
    }
  }, [batchMode, hasChanges, saveChanges, clearPendingChanges]);

  // Reset column settings
  const resetColumnSettings = useCallback(() => {
    if (tableId) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tableId}_visibility`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tableId}_sizing`);
    }
    setColumnVisibility(defaultColumnVisibility);
    setColumnSizing({});
  }, [tableId, defaultColumnVisibility]);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {!hideSearch && (
          <div className="flex items-center gap-4">
            <div className="h-10 w-64 bg-background-tertiary animate-pulse rounded-lg" />
          </div>
        )}
        <SkeletonTable rows={pagination.pageSize || 20} columns={columns.length} />
      </div>
    );
  }

  const isEmpty = data.length === 0;
  const hasNoResults = table.getFilteredRowModel().rows.length === 0 && !isEmpty;

  return (
    <div 
      className={cn('space-y-4', className)}
      onKeyDown={handleTableKeyDown}
      tabIndex={-1}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          {/* Search */}
          {!hideSearch && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
              <Input
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
                inputSize="md"
              />
            </div>
          )}
          
          {/* Batch mode buttons */}
          {batchMode && hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-secondary">
                {pendingChanges.length} değişiklik
              </span>
              <Button
                size="sm"
                onClick={saveChanges}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Kaydet
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearPendingChanges}
                disabled={isSaving}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                İptal
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Add row button */}
          {onAddRow && (
            <Button size="sm" onClick={onAddRow} className="gap-2">
                + {addRowText}
              </Button>
            )}
            
            {/* Column visibility toggle */}
            {showColumnToggle && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Sütunlar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Görünür Sütunlar</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    const colDef = columns.find(c => c.id === column.id);
                    const displayName = colDef?.header || column.id;
                    
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {displayName}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                <DropdownMenuSeparator />
                <div className="p-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={() => {
                      table.getAllColumns().forEach((column) => {
                        if (column.getCanHide()) {
                          column.toggleVisibility(true);
                        }
                      });
                    }}
                  >
                    Tümünü Göster
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-8 text-xs gap-1"
                    onClick={resetColumnSettings}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Sıfırla
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Custom toolbar */}
          {toolbar}
        </div>
      </div>

      {/* Table */}
      {isEmpty ? (
        emptyState || (
          <EmptyState
            icon={FileQuestion}
            title="Veri bulunamadı"
            description={emptyMessage || "Henüz kayıt bulunmuyor."}
            action={onAddRow && (
              <Button size="sm" onClick={onAddRow}>
                + {addRowText}
              </Button>
            )}
          />
        )
      ) : hasNoResults ? (
        <EmptyState
          icon={Search}
          title="Sonuç bulunamadı"
          description="Arama kriterlerinize uygun kayıt bulunamadı."
          action={
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setGlobalFilter('')}
            >
              Filtreleri temizle
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border-primary)] overflow-hidden">
          <div className="overflow-x-auto">
            <table 
              className="w-full"
              style={{ width: table.getCenterTotalSize() }}
            >
              <thead className="bg-background-secondary">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          'relative px-2 py-3 text-left text-subhead font-semibold text-foreground-secondary',
                          header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground'
                        )}
                        style={{ width: header.getSize() }}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div className="flex items-center gap-2">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                          {header.column.getCanSort() && (
                            <span className="text-foreground-tertiary">
                              {header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                        {/* Column resize handle */}
                        {enableColumnResize && header.column.getCanResize() && (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              'absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none',
                              'hover:bg-accent/50 active:bg-accent',
                              header.column.getIsResizing() && 'bg-accent'
                            )}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-[var(--color-border-secondary)]">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'bg-[var(--color-bg-primary)] hover:bg-background-secondary transition-colors'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 py-1 text-body text-foreground"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!hidePagination && !isEmpty && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-foreground-secondary">
            {table.getFilteredRowModel().rows.length} kayıttan{' '}
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} -{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            arası gösteriliyor
          </div>
          
          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="h-8 px-2 text-sm rounded border border-[var(--color-border-primary)] bg-background"
            >
              {(pagination.pageSizeOptions || [10, 20, 50, 100]).map((size) => (
                <option key={size} value={size}>
                  {size} satır
                </option>
              ))}
            </select>
            
            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm px-2">
                Sayfa {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="text-xs text-foreground-tertiary flex items-center gap-4">
        <span>Klavye: <kbd className="px-1 py-0.5 bg-background-secondary rounded">Çift tıkla</kbd> düzenle</span>
        <span><kbd className="px-1 py-0.5 bg-background-secondary rounded">Tab</kbd> sonraki hücre</span>
        <span><kbd className="px-1 py-0.5 bg-background-secondary rounded">Enter</kbd> kaydet & aşağı</span>
        <span><kbd className="px-1 py-0.5 bg-background-secondary rounded">Esc</kbd> iptal</span>
        {batchMode && <span><kbd className="px-1 py-0.5 bg-background-secondary rounded">Ctrl+S</kbd> tümünü kaydet</span>}
      </div>
    </div>
  );
}

export default EditableDataTable;
