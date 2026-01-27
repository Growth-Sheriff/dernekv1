import { useState, useCallback, useRef, useEffect } from 'react';

interface UseColumnResizeOptions {
  columnId: string;
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  onResize: (columnId: string, width: number) => void;
}

interface UseColumnResizeReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  resizeHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    className: string;
    style: React.CSSProperties;
  };
}

/**
 * Hook for column resizing with mouse drag
 *
 * Usage:
 * const { width, isResizing, resizeHandleProps } = useColumnResize({
 *   columnId: 'name',
 *   initialWidth: 200,
 *   minWidth: 100,
 *   maxWidth: 500,
 *   onResize: (id, width) => console.log(id, width)
 * });
 */
export const useColumnResize = ({
  columnId,
  initialWidth,
  minWidth = 50,
  maxWidth = 800,
  onResize,
}: UseColumnResizeOptions): UseColumnResizeReturn => {
  const [width, setWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Update width when initialWidth changes
  useEffect(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startX.current = e.clientX;
    startWidth.current = width;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;

    const diff = e.clientX - startX.current;
    const newWidth = Math.max(
      minWidth,
      Math.min(maxWidth, startWidth.current + diff)
    );

    setWidth(newWidth);
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    // Call onResize with final width
    onResize(columnId, width);
  }, [isResizing, columnId, width, onResize]);

  // Add/remove global event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const resizeHandleProps = {
    onMouseDown: handleMouseDown,
    className: `
      absolute right-0 top-0 w-1 h-full cursor-col-resize
      hover:bg-blue-400 hover:w-1.5
      ${isResizing ? 'bg-blue-500 w-1.5' : 'bg-transparent'}
      transition-all duration-150
    `.trim().replace(/\s+/g, ' '),
    style: {
      zIndex: 10,
    } as React.CSSProperties,
  };

  return {
    width,
    isResizing,
    handleMouseDown,
    resizeHandleProps,
  };
};

/**
 * Batch update widths for multiple columns
 * Debounces the save to avoid too many backend calls
 */
export const useDebouncedResize = (
  onSave: (widths: Record<string, number>) => void,
  delay: number = 500
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const widthsRef = useRef<Record<string, number>>({});

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSave(widthsRef.current);
    }, delay);
  }, [onSave, delay]);

  const updateWidth = useCallback((columnId: string, width: number) => {
    widthsRef.current[columnId] = width;
    debouncedSave();
  }, [debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { updateWidth };
};
