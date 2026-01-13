import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const badgeVariants = cva(
  `inline-flex items-center gap-1 rounded-full 
   font-medium transition-colors`,
  {
    variants: {
      variant: {
        default: 'bg-background-secondary text-foreground-secondary',
        primary: 'bg-accent/10 text-accent',
        secondary: 'bg-background-tertiary text-foreground-secondary',
        success: 'bg-success-light text-success',
        warning: 'bg-warning-light text-warning',
        error: 'bg-error-light text-error',
        info: 'bg-info-light text-info',
        outline: 'border border-[var(--color-border-primary)] text-foreground-secondary bg-transparent',
      },
      size: {
        sm: 'px-2 py-0.5 text-caption',
        md: 'px-2.5 py-1 text-footnote',
        lg: 'px-3 py-1.5 text-callout',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Show a dot indicator before the text */
  dot?: boolean;
  /** Show a remove button */
  removable?: boolean;
  /** Callback when remove button is clicked */
  onRemove?: () => void;
  /** Left icon */
  leftIcon?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className, 
    variant, 
    size, 
    dot = false, 
    removable = false, 
    onRemove,
    leftIcon,
    children, 
    ...props 
  }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span 
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              variant === 'success' && 'bg-success',
              variant === 'warning' && 'bg-warning',
              variant === 'error' && 'bg-error',
              variant === 'info' && 'bg-info',
              variant === 'primary' && 'bg-accent',
              (!variant || variant === 'default' || variant === 'secondary' || variant === 'outline') && 'bg-foreground-secondary'
            )}
          />
        )}
        {leftIcon}
        {children}
        {removable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="ml-0.5 -mr-1 h-4 w-4 rounded-full 
                       hover:bg-black/10 dark:hover:bg-white/10
                       flex items-center justify-center
                       transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { badgeVariants };
