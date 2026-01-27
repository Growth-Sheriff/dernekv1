  import React, { useState, useEffect } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { SkeletonTable } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';
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
} from 'lucide-react';

const STORAGE_KEY_PREFIX = 'bader_column_visibility_';

export interface DataTableProps<TData, TValue> {
  /** Column definitions */
  columns: ColumnDef<TData, TValue>[];
  /** Data array */
  data: TData[];
  /** Loading state */
  loading?: boolean;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Empty message (alternative to emptyState) */
  emptyMessage?: string;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Column key to search */
  searchKey?: string;
  /** Pagination config */
  pagination?: {
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  /** Enable row selection */
  enableSelection?: boolean;
  /** Selection change callback */
  onSelectionChange?: (rows: TData[]) => void;
  /** Row click callback */
  onRowClick?: (row: TData) => void;
  /** Toolbar content */
  toolbar?: React.ReactNode;
  /** Custom className */
  className?: string;
  /** Hide search bar */
  hideSearch?: boolean;
  /** Show search bar (alias for !hideSearch) */
  showSearch?: boolean;
  /** Hide pagination */
  hidePagination?: boolean;
  /** Unique table ID for localStorage column visibility persistence */
  tableId?: string;
  /** Default column visibility state */
  defaultColumnVisibility?: VisibilityState;
  /** Show column visibility toggle button */
  showColumnToggle?: boolean;
  /** Server-side pagination - when true, pagination is handled externally */
  serverSide?: boolean;
  /** Total row count for server-side pagination */
  totalCount?: number;
  /** Current page index (0-based) for server-side pagination */
  pageIndex?: number;
  /** Page size for server-side pagination */
  pageSize?: number;
  /** Callback when page changes (server-side) */
  onPageChange?: (pageIndex: number, pageSize: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  emptyState,
  emptyMessage,
  searchPlaceholder = 'Ara...',
  searchKey,
  pagination = { pageSize: 10, pageSizeOptions: [10, 20, 50, 100] },
  enableSelection = false,
  onSelectionChange,
  onRowClick,
  toolbar,
  className,
  hideSearch = false,
  showSearch,
  hidePagination = false,
  tableId,
  defaultColumnVisibility = {},
  showColumnToggle = false,
  serverSide = false,
  totalCount = 0,
  pageIndex: externalPageIndex = 0,
  pageSize: externalPageSize,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  // Handle both hideSearch and showSearch props
  const shouldShowSearch = showSearch !== undefined ? showSearch : !hideSearch;
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  
  // Load column visibility from localStorage or use defaults
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (tableId) {
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${tableId}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return defaultColumnVisibility;
  });
  
  // Save column visibility to localStorage when it changes
  React.useEffect(() => {
    if (tableId && Object.keys(columnVisibility).length > 0) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${tableId}`, JSON.stringify(columnVisibility));
    }
  }, [tableId, columnVisibility]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: serverSide ? undefined : getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    manualPagination: serverSide,
    manualFiltering: serverSide,
    pageCount: serverSide ? Math.ceil(totalCount / (externalPageSize || pagination.pageSize || 10)) : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      ...(serverSide && {
        pagination: {
          pageIndex: externalPageIndex,
          pageSize: externalPageSize || pagination.pageSize || 10,
        },
      }),
    },
    initialState: {
      pagination: {
        pageSize: externalPageSize || pagination.pageSize || 10,
      },
    },
  });

  // Notify parent about selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {shouldShowSearch && (
          <div className="flex items-center gap-4">
            <div className="h-10 w-64 bg-background-tertiary animate-pulse rounded-lg" />
          </div>
        )}
        <SkeletonTable rows={pagination.pageSize || 10} columns={columns.length} />
      </div>
    );
  }

  const isEmpty = data.length === 0;
  const hasNoResults = table.getFilteredRowModel().rows.length === 0 && !isEmpty;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          {shouldShowSearch && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-tertiary" />
              <Input
                placeholder={searchPlaceholder}
                value={searchKey 
                  ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? '' 
                  : globalFilter
                }
                onChange={(e) => {
                  if (searchKey) {
                    table.getColumn(searchKey)?.setFilterValue(e.target.value);
                  } else {
                    setGlobalFilter(e.target.value);
                  }
                }}
                className="pl-9"
                inputSize="md"
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
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
                    // Get column header for display
                    const header = column.columnDef.header;
                    const displayName = typeof header === 'string' 
                      ? header 
                      : column.id.charAt(0).toUpperCase() + column.id.slice(1).replace(/_/g, ' ');
                    
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
                    onClick={() => {
                      if (tableId) {
                        localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tableId}`);
                      }
                      setColumnVisibility(defaultColumnVisibility);
                    }}
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
              onClick={() => {
                setGlobalFilter('');
                setColumnFilters([]);
              }}
            >
              Filtreleri temizle
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-[var(--color-border-primary)] overflow-hidden">
          <table className="w-full">
            <thead className="bg-background-secondary">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left text-subhead font-semibold text-foreground-secondary',
                        header.column.getCanSort() && 'cursor-pointer select-none hover:text-foreground'
                      )}
                      onClick={header.column.getToggleSortingHandler()}
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
                    'bg-[var(--color-bg-primary)] hover:bg-background-secondary transition-colors',
                    row.getIsSelected() && 'bg-accent/5',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-body text-foreground"
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
      )}

      {/* Pagination */}
      {!hidePagination && !isEmpty && !hasNoResults && (
        <DataTablePagination
          table={table}
          pageSizeOptions={pagination.pageSizeOptions}
          serverSide={serverSide}
          totalCount={totalCount}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

// Pagination Component
interface DataTablePaginationProps<TData> {
  table: ReturnType<typeof useReactTable<TData>>;
  pageSizeOptions?: number[];
  serverSide?: boolean;
  totalCount?: number;
  onPageChange?: (pageIndex: number, pageSize: number) => void;
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
  serverSide = false,
  totalCount = 0,
  onPageChange,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = serverSide 
    ? Math.ceil(totalCount / pageSize) 
    : table.getPageCount();
  const rowCount = serverSide 
    ? totalCount 
    : table.getFilteredRowModel().rows.length;

  const handlePageChange = (newPageIndex: number) => {
    if (serverSide && onPageChange) {
      onPageChange(newPageIndex, pageSize);
    } else {
      table.setPageIndex(newPageIndex);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (serverSide && onPageChange) {
      onPageChange(0, newPageSize); // Reset to first page when page size changes
    } else {
      table.setPageSize(newPageSize);
    }
  };

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  return (
    <div className="flex items-center justify-between">
      {/* Row count */}
      <div className="text-callout text-foreground-secondary">
        {!serverSide && table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} / {' '}
          </span>
        )}
        <span>
          Toplam {rowCount} kayıt
        </span>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-callout text-foreground-secondary">
            Sayfa başına:
          </span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="h-8 px-2 rounded-md border border-[var(--color-border-primary)] 
                       bg-[var(--color-bg-primary)] text-callout
                       focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page info */}
        <span className="text-callout text-foreground-secondary min-w-[100px] text-center">
          Sayfa {pageIndex + 1} / {pageCount || 1}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePageChange(0)}
            disabled={!canPreviousPage}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={!canPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={!canNextPage}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={!canNextPage}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DataTable;
