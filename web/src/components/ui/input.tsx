import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  `w-full bg-[var(--color-bg-primary)] border rounded-lg
   text-foreground placeholder:text-foreground-tertiary
   transition-all duration-fast
   focus:outline-none focus:ring-2 focus:ring-accent/20 
   focus:border-[var(--color-border-focus)]
   disabled:opacity-50 disabled:cursor-not-allowed
   file:border-0 file:bg-transparent file:text-sm file:font-medium`,
  {
    variants: {
      inputSize: {
        sm: 'h-8 px-3 text-callout',
        md: 'h-10 px-4 text-body',
        lg: 'h-12 px-4 text-headline',
      },
      state: {
        default: 'border-[var(--color-border-primary)]',
        error: 'border-error focus:ring-error/20 focus:border-error',
        success: 'border-success focus:ring-success/20 focus:border-success',
        warning: 'border-warning focus:ring-warning/20 focus:border-warning',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, state, leftIcon, rightIcon, error, ...props }, ref) => {
    const actualState = error ? 'error' : state;
    
    if (leftIcon || rightIcon) {
      return (
        <div className="relative w-full">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary">
              {leftIcon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              inputVariants({ inputSize, state: actualState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-tertiary">
              {rightIcon}
            </div>
          )}
          {error && (
            <p className="mt-1 text-footnote text-error">{error}</p>
          )}
        </div>
      );
    }
    
    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            inputVariants({ inputSize, state: actualState }),
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-footnote text-error">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
