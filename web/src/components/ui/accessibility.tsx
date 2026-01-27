import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Accessibility Utilities - Apple HIG Compliant
// ============================================================================

/**
 * VisuallyHidden - Hides content visually but keeps it accessible to screen readers
 * Use for: icon-only buttons, decorative elements, skip links
 */
export const VisuallyHidden: React.FC<{
  children: React.ReactNode;
  as?: 'span' | 'div' | 'label';
}> = ({ children, as: Component = 'span' }) => (
  <Component
    className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
    style={{ clip: 'rect(0, 0, 0, 0)' }}
  >
    {children}
  </Component>
);

/**
 * SkipToContent - Skip navigation link for keyboard users
 * Place at the top of your page layout
 */
export const SkipToContent: React.FC<{
  targetId?: string;
  children?: React.ReactNode;
}> = ({ targetId = 'main-content', children = 'Ana içeriğe geç' }) => (
  <a
    href={`#${targetId}`}
    className={cn(
      'sr-only focus:not-sr-only',
      'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
      'focus:px-4 focus:py-2 focus:rounded-lg',
      'focus:bg-primary focus:text-primary-foreground',
      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      'font-medium text-sm transition-all'
    )}
  >
    {children}
  </a>
);

/**
 * FocusTrap - Traps keyboard focus within a container
 * Use for: modals, dialogs, dropdown menus
 */
interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  returnFocusOnDeactivate?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  returnFocusOnDeactivate = true,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!active) return;

    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first focusable element
    const container = containerRef.current;
    if (container) {
      const firstFocusable = container.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }

    return () => {
      if (returnFocusOnDeactivate && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [active, returnFocusOnDeactivate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!active || e.key !== 'Tab') return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

/**
 * LiveRegion - Announces dynamic content changes to screen readers
 * Use for: form validation, loading states, notifications
 */
interface LiveRegionProps {
  children: React.ReactNode;
  assertive?: boolean;
  atomic?: boolean;
  className?: string;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  assertive = false,
  atomic = true,
  className,
}) => (
  <div
    role="status"
    aria-live={assertive ? 'assertive' : 'polite'}
    aria-atomic={atomic}
    className={cn('sr-only', className)}
  >
    {children}
  </div>
);

/**
 * useAnnounce - Hook for announcing messages to screen readers
 */
export function useAnnounce() {
  const [message, setMessage] = React.useState('');

  const announce = React.useCallback((text: string, delay = 100) => {
    // Clear and then set after a delay to ensure announcement
    setMessage('');
    setTimeout(() => setMessage(text), delay);
  }, []);

  const Announcer = React.useCallback(
    () => <LiveRegion>{message}</LiveRegion>,
    [message]
  );

  return { announce, Announcer };
}

/**
 * Keyboard navigation utilities
 */
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
} as const;

/**
 * Check if keyboard event is an activation key (Enter or Space)
 */
export const isActivationKey = (e: React.KeyboardEvent): boolean =>
  e.key === KeyboardKeys.ENTER || e.key === KeyboardKeys.SPACE;

/**
 * Handle keyboard activation for custom interactive elements
 */
export const onKeyboardActivate = (
  handler: (e: React.KeyboardEvent) => void
) => (e: React.KeyboardEvent) => {
  if (isActivationKey(e)) {
    e.preventDefault();
    handler(e);
  }
};
