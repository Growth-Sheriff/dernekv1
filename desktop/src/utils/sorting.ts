import { SortDirection, SortConfig } from '@/types/columnConfig';

/**
 * Generic sorting utility
 * Supports string, number, date, and null/undefined values
 */
export function sortData<T extends Record<string, any>>(
  data: T[],
  sortConfig: SortConfig | null | undefined
): T[] {
  if (!sortConfig || !sortConfig.direction) {
    return data;
  }

  const { columnId, direction } = sortConfig;

  return [...data].sort((a, b) => {
    const aValue = a[columnId];
    const bValue = b[columnId];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Determine value types
    const aType = typeof aValue;
    const bType = typeof bValue;

    let comparison = 0;

    // String comparison (case-insensitive)
    if (aType === 'string' && bType === 'string') {
      comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase(), 'tr-TR');
    }
    // Number comparison
    else if (aType === 'number' && bType === 'number') {
      comparison = aValue - bValue;
    }
    // Date comparison (check if string is date-like)
    else if (isDateString(aValue) && isDateString(bValue)) {
      const aDate = new Date(aValue).getTime();
      const bDate = new Date(bValue).getTime();
      comparison = aDate - bDate;
    }
    // Fallback to string comparison
    else {
      comparison = String(aValue).localeCompare(String(bValue), 'tr-TR');
    }

    // Apply direction
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Check if a string is a valid date
 */
function isDateString(value: any): boolean {
  if (typeof value !== 'string') return false;
  // Check for ISO date format or common date patterns
  const datePattern = /^\d{4}-\d{2}-\d{2}/;
  return datePattern.test(value) && !isNaN(Date.parse(value));
}

/**
 * Toggle sort direction: null -> asc -> desc -> null
 */
export function getNextSortDirection(current: SortDirection): SortDirection {
  if (current === null) return 'asc';
  if (current === 'asc') return 'desc';
  return null;
}

/**
 * Get sort icon based on direction
 */
export function getSortIcon(direction: SortDirection): string {
  if (direction === 'asc') return '↑';
  if (direction === 'desc') return '↓';
  return '↕';
}
