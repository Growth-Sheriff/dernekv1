import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
    ArrowUpDown, ArrowUp, ArrowDown,
    Settings2, FileSpreadsheet, FileText,
    Check, X, MoreHorizontal, Columns3,
    CheckSquare, Square, Filter, RefreshCw,
    Download, Trash2, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ColumnConfig } from '@/types/columnConfig';
import { sortData } from '@/utils/sorting';

// ============ TYPES ============
export interface SmartTableColumn<T = any> {
    id: string;
    header: string;
    accessor: keyof T | ((row: T) => any);
    render?: (value: any, row: T, index: number) => React.ReactNode;
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    filterable?: boolean;
    pinned?: 'left' | 'right' | false;
    className?: string;
    headerClassName?: string;
}

export interface SmartTableAction<T = any> {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (row: T) => void;
    variant?: 'default' | 'destructive' | 'outline';
    condition?: (row: T) => boolean;
}

export interface BulkAction<T = any> {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: T[]) => void;
    variant?: 'default' | 'destructive' | 'outline';
    confirmMessage?: string;
}

export interface SmartTableProps<T = any> {
    data: T[];
    columns: SmartTableColumn<T>[];
    actions?: SmartTableAction<T>[];
    bulkActions?: BulkAction<T>[];

    // Features
    selectable?: boolean;
    sortable?: boolean;
    resizable?: boolean;
    stickyHeader?: boolean;

    // Config
    columnConfig?: ColumnConfig | null;
    onColumnSettings?: () => void;
    onSort?: (columnId: string) => void;

    // Export
    exportFileName?: string;
    onExportExcel?: () => void;
    onExportPDF?: () => void;

    // Styling
    rowHeight?: number;
    maxHeight?: number | string;
    emptyMessage?: string;
    loading?: boolean;

    // Row events
    onRowClick?: (row: T) => void;
    onRowDoubleClick?: (row: T) => void;
    getRowClassName?: (row: T, index: number) => string;

    // Selection
    selectedRows?: T[];
    onSelectionChange?: (selected: T[]) => void;
    getRowId?: (row: T) => string;
}

// ============ COMPONENT ============
export function SmartTable<T extends { id?: string }>({
    data,
    columns,
    actions = [],
    bulkActions = [],
    selectable = false,
    sortable = true,
    resizable = false,
    stickyHeader = true,
    columnConfig,
    onColumnSettings,
    onSort,
    exportFileName = 'export',
    onExportExcel,
    onExportPDF,
    rowHeight = 56,
    maxHeight = 600,
    emptyMessage = 'Kayıt bulunamadı',
    loading = false,
    onRowClick,
    onRowDoubleClick,
    getRowClassName,
    selectedRows: externalSelectedRows,
    onSelectionChange,
    getRowId = (row) => (row as any).id || String(Math.random()),
}: SmartTableProps<T>) {
    const parentRef = useRef<HTMLDivElement>(null);
    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [resizingColumn, setResizingColumn] = useState<string | null>(null);

    // Selection management
    const selectedIds = useMemo(() => {
        if (externalSelectedRows) {
            return new Set(externalSelectedRows.map(getRowId));
        }
        return internalSelectedIds;
    }, [externalSelectedRows, internalSelectedIds, getRowId]);

    const selectedCount = selectedIds.size;
    const allSelected = data.length > 0 && selectedCount === data.length;
    const someSelected = selectedCount > 0 && selectedCount < data.length;

    // Apply sorting
    const sortedData = useMemo(() => {
        return sortData(data, columnConfig?.sort);
    }, [data, columnConfig?.sort]);

    // Virtual scrolling
    const virtualizer = useVirtualizer({
        count: sortedData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan: 10,
    });

    // Column visibility based on config
    const visibleColumns = useMemo(() => {
        // If no config or no visible columns specified, show all columns
        if (!columnConfig || !columnConfig.visible || columnConfig.visible.length === 0) {
            return columns;
        }
        return columns.filter(col =>
            columnConfig.visible.includes(col.id)
        ).sort((a, b) => {
            const aIndex = columnConfig.order?.indexOf(a.id) ?? 0;
            const bIndex = columnConfig.order?.indexOf(b.id) ?? 0;
            return aIndex - bIndex;
        });
    }, [columns, columnConfig]);

    // Get column width
    const getColumnWidth = useCallback((col: SmartTableColumn<T>) => {
        return columnWidths[col.id] || col.width || 150;
    }, [columnWidths]);

    // Sort icon
    const getSortIcon = (columnId: string) => {
        if (!columnConfig?.sort || columnConfig.sort.columnId !== columnId) {
            return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
        }
        if (columnConfig.sort.direction === 'asc') {
            return <ArrowUp className="w-3 h-3 text-blue-600" />;
        }
        return <ArrowDown className="w-3 h-3 text-blue-600" />;
    };

    // Selection handlers
    const toggleSelectAll = () => {
        if (allSelected) {
            setInternalSelectedIds(new Set());
            onSelectionChange?.([]);
        } else {
            const allIds = new Set(data.map(getRowId));
            setInternalSelectedIds(allIds);
            onSelectionChange?.(data);
        }
    };

    const toggleRowSelection = (row: T) => {
        const rowId = getRowId(row);
        const newSelectedIds = new Set(selectedIds);

        if (newSelectedIds.has(rowId)) {
            newSelectedIds.delete(rowId);
        } else {
            newSelectedIds.add(rowId);
        }

        setInternalSelectedIds(newSelectedIds);
        onSelectionChange?.(data.filter(r => newSelectedIds.has(getRowId(r))));
    };

    // Get cell value
    const getCellValue = (row: T, col: SmartTableColumn<T>) => {
        if (typeof col.accessor === 'function') {
            return col.accessor(row);
        }
        return row[col.accessor];
    };

    // Render cell
    const renderCell = (row: T, col: SmartTableColumn<T>, index: number) => {
        const value = getCellValue(row, col);
        if (col.render) {
            return col.render(value, row, index);
        }
        return value ?? '-';
    };

    // Column resize handler
    const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
        if (!resizable) return;
        e.preventDefault();
        setResizingColumn(columnId);

        const startX = e.clientX;
        const startWidth = columnWidths[columnId] || columns.find(c => c.id === columnId)?.width || 150;

        const handleMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startX;
            const newWidth = Math.max(80, startWidth + diff);
            setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
        };

        const handleMouseUp = () => {
            setResizingColumn(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Empty state
    if (!loading && sortedData.length === 0) {
        return (
            <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Filter className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{emptyMessage}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Arama kriterlerinizi değiştirmeyi deneyin</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
            style={{ color: '#1f2937' }}
        >
            {/* Bulk Actions Bar */}
            {selectable && selectedCount > 0 && bulkActions.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="px-3 py-1 bg-blue-100 text-blue-700">
                            {selectedCount} kayıt seçildi
                        </Badge>
                        <button
                            onClick={() => {
                                setInternalSelectedIds(new Set());
                                onSelectionChange?.([]);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            <X className="w-3 h-3" />
                            Seçimi Temizle
                        </button>
                    </div>
                    <div className="flex gap-2">
                        {bulkActions.map(action => (
                            <Button
                                key={action.id}
                                variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                                size="sm"
                                onClick={() => {
                                    const selectedData = data.filter(r => selectedIds.has(getRowId(r)));
                                    if (action.confirmMessage && !confirm(action.confirmMessage)) return;
                                    action.onClick(selectedData);
                                }}
                                className="flex items-center gap-1.5"
                            >
                                {action.icon}
                                {action.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={cn(
                "bg-gray-50/80 backdrop-blur-sm border-b",
                stickyHeader && "sticky top-0 z-10"
            )}>
                <div className="flex items-center px-4 py-3">
                    {/* Select All Checkbox */}
                    {selectable && (
                        <div className="flex-shrink-0 w-10">
                            <Checkbox
                                checked={someSelected ? 'indeterminate' : allSelected}
                                onCheckedChange={toggleSelectAll}
                            />
                        </div>
                    )}

                    {/* Column Headers */}
                    <div className="flex flex-1">
                        {visibleColumns.map((col, idx) => (
                            <div
                                key={col.id}
                                className={cn(
                                    "flex items-center gap-1 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider select-none",
                                    col.align === 'right' && "justify-end",
                                    col.align === 'center' && "justify-center",
                                    col.headerClassName
                                )}
                                style={{
                                    width: getColumnWidth(col),
                                    minWidth: col.minWidth || 80,
                                    maxWidth: col.maxWidth,
                                    flexShrink: 0,
                                }}
                            >
                                {col.sortable !== false && sortable && onSort ? (
                                    <button
                                        onClick={() => onSort(col.id)}
                                        className="flex items-center gap-1 hover:text-gray-900 transition-colors group"
                                    >
                                        <span>{col.header}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            {getSortIcon(col.id)}
                                        </span>
                                    </button>
                                ) : (
                                    <span>{col.header}</span>
                                )}

                                {/* Resize Handle */}
                                {resizable && idx < visibleColumns.length - 1 && (
                                    <div
                                        className={cn(
                                            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors",
                                            resizingColumn === col.id && "bg-blue-500"
                                        )}
                                        onMouseDown={(e) => handleResizeStart(e, col.id)}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Actions Header */}
                    {actions.length > 0 && (
                        <div className="flex-shrink-0 w-24 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">
                            İşlemler
                        </div>
                    )}

                    {/* Column Settings */}
                    {onColumnSettings && (
                        <button
                            onClick={onColumnSettings}
                            className="flex-shrink-0 ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Sütun Ayarları"
                        >
                            <Columns3 className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
                    <div className="flex items-center gap-3 text-gray-600">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Yükleniyor...</span>
                    </div>
                </div>
            )}

            {/* Virtual Scrolling Container */}
            <div
                ref={parentRef}
                className="overflow-auto relative"
                style={{ maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                        const row = sortedData[virtualRow.index];
                        const rowId = getRowId(row);
                        const isSelected = selectedIds.has(rowId);

                        return (
                            <div
                                key={virtualRow.key}
                                data-index={virtualRow.index}
                                ref={virtualizer.measureElement}
                                className={cn(
                                    "absolute top-0 left-0 w-full border-b border-gray-100 dark:border-gray-800 transition-all duration-150",
                                    "hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent dark:hover:from-gray-800 dark:hover:to-transparent",
                                    isSelected && "bg-blue-50/50 dark:bg-blue-900/20",
                                    onRowClick && "cursor-pointer",
                                    getRowClassName?.(row, virtualRow.index)
                                )}
                                style={{
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                                onClick={() => onRowClick?.(row)}
                                onDoubleClick={() => onRowDoubleClick?.(row)}
                            >
                                <div className="flex items-center px-4 py-3">
                                    {/* Row Selection */}
                                    {selectable && (
                                        <div
                                            className="flex-shrink-0 w-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleRowSelection(row);
                                            }}
                                        >
                                            <Checkbox checked={isSelected} />
                                        </div>
                                    )}

                                    {/* Cells */}
                                    <div className="flex flex-1" style={{ color: '#1f2937' }}>
                                        {visibleColumns.map((col) => (
                                            <div
                                                key={col.id}
                                                className={cn(
                                                    "px-3 py-1 truncate",
                                                    col.align === 'right' && "text-right",
                                                    col.align === 'center' && "text-center",
                                                    col.className
                                                )}
                                                style={{
                                                    width: getColumnWidth(col),
                                                    minWidth: col.minWidth || 80,
                                                    maxWidth: col.maxWidth,
                                                    flexShrink: 0,
                                                    color: '#1f2937',
                                                }}
                                            >
                                                {renderCell(row, col, virtualRow.index)}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Row Actions */}
                                    {actions.length > 0 && (
                                        <div className="flex-shrink-0 w-24 flex justify-end">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    {actions
                                                        .filter(action => !action.condition || action.condition(row))
                                                        .map((action, idx) => (
                                                            <React.Fragment key={action.id}>
                                                                {idx > 0 && action.variant === 'destructive' && (
                                                                    <DropdownMenuSeparator />
                                                                )}
                                                                <DropdownMenuItem
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        action.onClick(row);
                                                                    }}
                                                                    className={cn(
                                                                        "flex items-center gap-2",
                                                                        action.variant === 'destructive' && "text-red-600 focus:text-red-600"
                                                                    )}
                                                                >
                                                                    {action.icon}
                                                                    <span>{action.label}</span>
                                                                </DropdownMenuItem>
                                                            </React.Fragment>
                                                        ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50/80 backdrop-blur-sm border-t px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                        Toplam <span className="font-semibold text-gray-900">{sortedData.length}</span> kayıt
                        {virtualizer.getVirtualItems().length < sortedData.length && (
                            <span className="ml-2 text-xs text-gray-400">
                                (Görünen: {virtualizer.getVirtualItems().length})
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {onExportExcel && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExportExcel}
                                className="flex items-center gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>Excel</span>
                            </Button>
                        )}

                        {onExportPDF && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onExportPDF}
                                className="flex items-center gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
                            >
                                <FileText className="w-4 h-4" />
                                <span>PDF</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
