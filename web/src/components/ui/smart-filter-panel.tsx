import React, { useState, useCallback } from 'react';
import {
    Filter, X, ChevronDown, ChevronUp, Calendar,
    Search, Save, Trash2, RotateCcw, Bookmark,
    SlidersHorizontal, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ============ TYPES ============
export interface FilterDefinition {
    id: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'dateRange' | 'number' | 'numberRange' | 'boolean';
    options?: { value: string; label: string }[];
    placeholder?: string;
    defaultValue?: any;
}

export interface FilterValue {
    id: string;
    value: any;
    operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'between';
}

export interface SavedFilter {
    id: string;
    name: string;
    filters: FilterValue[];
    isDefault?: boolean;
}

export interface DatePreset {
    label: string;
    getValue: () => { start: string; end: string };
}

export interface SmartFilterPanelProps {
    filters: FilterDefinition[];
    values: FilterValue[];
    onChange: (values: FilterValue[]) => void;

    // Search
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;

    // Saved filters
    savedFilters?: SavedFilter[];
    onSaveFilter?: (name: string, filters: FilterValue[]) => void;
    onDeleteSavedFilter?: (id: string) => void;
    onApplySavedFilter?: (filter: SavedFilter) => void;

    // Date presets
    datePresets?: DatePreset[];

    // Quick filters
    quickFilters?: {
        id: string;
        label: string;
        filters: FilterValue[];
        color?: string;
        icon?: React.ReactNode;
    }[];

    // Styling
    className?: string;
    compact?: boolean;
}

// ============ DEFAULT DATE PRESETS ============
export const DEFAULT_DATE_PRESETS: DatePreset[] = [
    {
        label: 'Bugün',
        getValue: () => {
            const today = new Date().toISOString().split('T')[0];
            return { start: today, end: today };
        },
    },
    {
        label: 'Bu Hafta',
        getValue: () => {
            const now = new Date();
            const start = new Date(now.setDate(now.getDate() - now.getDay() + 1));
            const end = new Date(now.setDate(now.getDate() + 6));
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        },
    },
    {
        label: 'Bu Ay',
        getValue: () => {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        },
    },
    {
        label: 'Son 30 Gün',
        getValue: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        },
    },
    {
        label: 'Son 90 Gün',
        getValue: () => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 90);
            return {
                start: start.toISOString().split('T')[0],
                end: end.toISOString().split('T')[0],
            };
        },
    },
    {
        label: 'Bu Yıl',
        getValue: () => {
            const now = new Date();
            return {
                start: `${now.getFullYear()}-01-01`,
                end: `${now.getFullYear()}-12-31`,
            };
        },
    },
    {
        label: 'Geçen Yıl',
        getValue: () => {
            const now = new Date();
            return {
                start: `${now.getFullYear() - 1}-01-01`,
                end: `${now.getFullYear() - 1}-12-31`,
            };
        },
    },
];

// ============ COMPONENT ============
export const SmartFilterPanel: React.FC<SmartFilterPanelProps> = ({
    filters,
    values,
    onChange,
    searchValue = '',
    onSearchChange,
    searchPlaceholder = 'Ara...',
    savedFilters = [],
    onSaveFilter,
    onDeleteSavedFilter,
    onApplySavedFilter,
    datePresets = DEFAULT_DATE_PRESETS,
    quickFilters = [],
    className,
    compact = false,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    // Active filters count
    const activeFilterCount = values.filter(v => v.value !== undefined && v.value !== '' && v.value !== null).length;

    // Get filter value by id
    const getFilterValue = useCallback((filterId: string) => {
        const filterValue = values.find(v => v.id === filterId);
        return filterValue?.value;
    }, [values]);

    // Update single filter
    const updateFilter = useCallback((filterId: string, value: any, operator?: FilterValue['operator']) => {
        const existingIndex = values.findIndex(v => v.id === filterId);
        const newValues = [...values];

        if (value === undefined || value === '' || value === null) {
            // Remove filter
            if (existingIndex > -1) {
                newValues.splice(existingIndex, 1);
            }
        } else if (existingIndex > -1) {
            // Update existing
            newValues[existingIndex] = { id: filterId, value, operator };
        } else {
            // Add new
            newValues.push({ id: filterId, value, operator });
        }

        onChange(newValues);
    }, [values, onChange]);

    // Clear all filters
    const clearAllFilters = () => {
        onChange([]);
        onSearchChange?.('');
    };

    // Apply date preset
    const applyDatePreset = (preset: DatePreset) => {
        const { start, end } = preset.getValue();
        // Find date or dateRange filters and update them
        const dateFilters = filters.filter(f => f.type === 'date' || f.type === 'dateRange');

        if (dateFilters.length >= 2) {
            updateFilter(dateFilters[0].id, start);
            updateFilter(dateFilters[1].id, end);
        } else if (dateFilters.length === 1 && dateFilters[0].type === 'dateRange') {
            updateFilter(dateFilters[0].id, { start, end });
        }
    };

    // Apply quick filter
    const applyQuickFilter = (quickFilter: typeof quickFilters[0]) => {
        onChange(quickFilter.filters);
    };

    // Save current filter
    const handleSaveFilter = () => {
        if (saveFilterName.trim() && onSaveFilter) {
            onSaveFilter(saveFilterName.trim(), values);
            setSaveFilterName('');
            setShowSaveDialog(false);
        }
    };

    // Render filter input based on type
    const renderFilterInput = (filter: FilterDefinition) => {
        const value = getFilterValue(filter.id);

        switch (filter.type) {
            case 'text':
                return (
                    <Input
                        value={value || ''}
                        onChange={(e) => updateFilter(filter.id, e.target.value)}
                        placeholder={filter.placeholder || filter.label}
                        className="h-9"
                    />
                );

            case 'select':
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => updateFilter(filter.id, e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">{filter.placeholder || `Tümü`}</option>
                        {filter.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            case 'date':
                return (
                    <Input
                        type="date"
                        value={value || ''}
                        onChange={(e) => updateFilter(filter.id, e.target.value)}
                        className="h-9"
                    />
                );

            case 'number':
                return (
                    <Input
                        type="number"
                        value={value || ''}
                        onChange={(e) => updateFilter(filter.id, e.target.value ? parseFloat(e.target.value) : '')}
                        placeholder={filter.placeholder || filter.label}
                        className="h-9"
                    />
                );

            case 'boolean':
                return (
                    <select
                        value={value === undefined ? '' : value.toString()}
                        onChange={(e) => {
                            if (e.target.value === '') {
                                updateFilter(filter.id, undefined);
                            } else {
                                updateFilter(filter.id, e.target.value === 'true');
                            }
                        }}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="">Tümü</option>
                        <option value="true">Evet</option>
                        <option value="false">Hayır</option>
                    </select>
                );

            default:
                return null;
        }
    };

    return (
        <div className={cn("space-y-3", className)}>
            {/* Main Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                {onSearchChange && (
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            value={searchValue}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="pl-9 h-10 bg-white border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                        />
                        {searchValue && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Quick Filters */}
                {quickFilters.length > 0 && (
                    <div className="flex gap-2">
                        {quickFilters.map(qf => (
                            <Button
                                key={qf.id}
                                variant="outline"
                                size="sm"
                                onClick={() => applyQuickFilter(qf)}
                                className={cn(
                                    "h-9 px-3 gap-1.5",
                                    qf.color && `border-${qf.color}-200 text-${qf.color}-700 hover:bg-${qf.color}-50`
                                )}
                            >
                                {qf.icon}
                                {qf.label}
                            </Button>
                        ))}
                    </div>
                )}

                {/* Date Presets Dropdown */}
                {datePresets.length > 0 && filters.some(f => f.type === 'date' || f.type === 'dateRange') && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                <Clock className="w-4 h-4" />
                                <span>Zaman Aralığı</span>
                                <ChevronDown className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                            <DropdownMenuLabel>Hızlı Seçim</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {datePresets.map(preset => (
                                <DropdownMenuItem
                                    key={preset.label}
                                    onClick={() => applyDatePreset(preset)}
                                >
                                    {preset.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Filter Toggle */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "h-9 gap-1.5",
                        activeFilterCount > 0 && "border-blue-200 bg-blue-50 text-blue-700"
                    )}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Filtreler</span>
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-blue-100 text-blue-700">
                            {activeFilterCount}
                        </Badge>
                    )}
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>

                {/* Saved Filters */}
                {savedFilters.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5">
                                <Bookmark className="w-4 h-4" />
                                <span>Kayıtlı Filtreler</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                            {savedFilters.map(sf => (
                                <DropdownMenuItem
                                    key={sf.id}
                                    onClick={() => onApplySavedFilter?.(sf)}
                                    className="flex items-center justify-between"
                                >
                                    <span>{sf.name}</span>
                                    {onDeleteSavedFilter && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSavedFilter(sf.id);
                                            }}
                                            className="text-gray-400 hover:text-red-500"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {/* Clear All */}
                {(activeFilterCount > 0 || searchValue) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-9 text-gray-500 hover:text-gray-700"
                    >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Temizle
                    </Button>
                )}

                {/* Save Filter */}
                {onSaveFilter && activeFilterCount > 0 && (
                    <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-9">
                                <Save className="w-4 h-4 mr-1" />
                                Kaydet
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72" align="end">
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">Filtreyi Kaydet</h4>
                                <Input
                                    value={saveFilterName}
                                    onChange={(e) => setSaveFilterName(e.target.value)}
                                    placeholder="Filtre adı..."
                                    className="h-9"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                                        İptal
                                    </Button>
                                    <Button size="sm" onClick={handleSaveFilter} disabled={!saveFilterName.trim()}>
                                        Kaydet
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            {/* Expanded Filter Panel */}
            {isExpanded && (
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white border rounded-xl shadow-sm">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {filters.map(filter => (
                            <div key={filter.id} className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-600">
                                    {filter.label}
                                </label>
                                {renderFilterInput(filter)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && !isExpanded && (
                <div className="flex flex-wrap gap-2">
                    {values
                        .filter(v => v.value !== undefined && v.value !== '' && v.value !== null)
                        .map(v => {
                            const filterDef = filters.find(f => f.id === v.id);
                            if (!filterDef) return null;

                            let displayValue = v.value;
                            if (filterDef.type === 'select' && filterDef.options) {
                                const option = filterDef.options.find(o => o.value === v.value);
                                displayValue = option?.label || v.value;
                            } else if (filterDef.type === 'boolean') {
                                displayValue = v.value ? 'Evet' : 'Hayır';
                            }

                            return (
                                <Badge
                                    key={v.id}
                                    variant="secondary"
                                    className="px-2 py-1 gap-1.5 bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                    <span className="font-normal text-blue-500">{filterDef.label}:</span>
                                    <span>{String(displayValue)}</span>
                                    <button
                                        onClick={() => updateFilter(v.id, undefined)}
                                        className="ml-0.5 hover:text-blue-900"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            );
                        })}
                </div>
            )}
        </div>
    );
};

export default SmartFilterPanel;
