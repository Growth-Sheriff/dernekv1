import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { AlertCircle, Info, HelpCircle } from 'lucide-react';
import { Label } from './label';
import { Text } from './typography';

// ============================================================================
// FormField - Wrapper for form inputs with label, error, and helper text
// ============================================================================

const formFieldVariants = cva('flex flex-col', {
  variants: {
    size: {
      sm: 'gap-1',
      md: 'gap-1.5',
      lg: 'gap-2',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface FormFieldProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof formFieldVariants> {
  /** Label text for the field */
  label?: string;
  /** Helper text shown below the input */
  helperText?: string;
  /** Hint text shown next to the label (e.g., "Otomatik oluşturulur") */
  hint?: string;
  /** Error message - when present, field shows error state */
  error?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Optional tooltip/info text */
  tooltip?: string;
  /** Unique ID for the form field (passed to input) */
  htmlFor?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      size,
      label,
      helperText,
      hint,
      error,
      required,
      tooltip,
      htmlFor,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <div
        ref={ref}
        className={cn(
          formFieldVariants({ size }),
          disabled && 'opacity-50 pointer-events-none',
          className
        )}
        {...props}
      >
        {/* Label Row */}
        {label && (
          <div className="flex items-center gap-1.5">
            <Label
              htmlFor={htmlFor}
              className={cn(
                'text-sm font-medium text-foreground',
                hasError && 'text-destructive'
              )}
            >
              {label}
              {required && (
                <span className="text-destructive ml-0.5" aria-hidden="true">
                  *
                </span>
              )}
            </Label>
            {hint && (
              <Text variant="small" className="text-muted-foreground">
                ({hint})
              </Text>
            )}
            {tooltip && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={tooltip}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Input Slot */}
        <div className="relative">
          {children}
        </div>

        {/* Helper/Error Text */}
        {(helperText || error) && (
          <div className="flex items-start gap-1.5">
            {hasError ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                <Text variant="small" className="text-destructive">
                  {error}
                </Text>
              </>
            ) : (
              <>
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <Text variant="small" className="text-muted-foreground">
                  {helperText}
                </Text>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

// ============================================================================
// FormSection - Groups related form fields
// ============================================================================

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Whether to show a divider above */
  divider?: boolean;
  /** Whether to use a card wrapper */
  card?: boolean;
  /** Number of columns for grid layout */
  columns?: 1 | 2 | 3 | 4;
}

export const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  (
    {
      className,
      title,
      description,
      divider = false,
      card = false,
      columns = 1,
      children,
      ...props
    },
    ref
  ) => {
    const gridClass = {
      1: 'grid-cols-1',
      2: 'grid-cols-1 md:grid-cols-2',
      3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    }[columns];

    const content = (
      <>
        {/* Section Header */}
        {(title || description) && (
          <div className="mb-4">
            {title && (
              <Text variant="body" weight="medium" className="text-foreground">
                {title}
              </Text>
            )}
            {description && (
              <Text variant="small" className="text-muted-foreground mt-1">
                {description}
              </Text>
            )}
          </div>
        )}

        {/* Form Fields Grid */}
        <div className={cn('grid gap-4', gridClass)}>{children}</div>
      </>
    );

    return (
      <div
        ref={ref}
        className={cn(
          divider && 'border-t border-border pt-6 mt-6',
          className
        )}
        {...props}
      >
        {card ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    );
  }
);
FormSection.displayName = 'FormSection';

// ============================================================================
// FormActions - Container for form submit/cancel buttons
// ============================================================================

export interface FormActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment of buttons */
  align?: 'left' | 'center' | 'right' | 'between';
  /** Whether to add top border/padding */
  sticky?: boolean;
}

export const FormActions = React.forwardRef<HTMLDivElement, FormActionsProps>(
  ({ className, align = 'right', sticky = false, children, ...props }, ref) => {
    const alignClass = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
      between: 'justify-between',
    }[align];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-3 pt-6',
          alignClass,
          sticky && 'sticky bottom-0 bg-background border-t border-border -mx-6 px-6 py-4 mt-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
FormActions.displayName = 'FormActions';

// ============================================================================
// Form - Main form wrapper
// ============================================================================

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /** Prevent default form submission */
  preventDefault?: boolean;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, preventDefault = true, onSubmit, children, ...props }, ref) => {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      if (preventDefault) {
        e.preventDefault();
      }
      onSubmit?.(e);
    };

    return (
      <form
        ref={ref}
        className={cn('space-y-6', className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    );
  }
);
Form.displayName = 'Form';

export default Form;
