import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Card - macOS-style card component
// ============================================================================

const cardVariants = cva(
  [
    'rounded-xl border bg-card text-card-foreground',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: 'border-border shadow-sm',
        elevated: 'border-border/50 shadow-md hover:shadow-lg',
        outline: 'border-border bg-transparent shadow-none',
        ghost: 'border-transparent bg-transparent shadow-none',
        interactive: [
          'border-border shadow-sm',
          'hover:border-border/80 hover:shadow-md',
          'cursor-pointer',
        ],
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Optional click handler for interactive cards */
  onClick?: () => void;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, onClick, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...props}
    />
  )
);
Card.displayName = 'Card';

// ============================================================================
// CardHeader
// ============================================================================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional action buttons/elements for the header */
  action?: React.ReactNode;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5 p-6',
        action && 'flex-row items-start justify-between space-y-0',
        className
      )}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

// ============================================================================
// CardTitle
// ============================================================================

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-foreground',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

// ============================================================================
// CardDescription
// ============================================================================

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground mt-1.5', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// ============================================================================
// CardContent
// ============================================================================

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// ============================================================================
// CardFooter
// ============================================================================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to add a top border */
  border?: boolean;
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, border = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center p-6 pt-0',
        border && 'border-t border-border pt-6 mt-2',
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

// ============================================================================
// CardImage - For cards with hero images
// ============================================================================

export interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Position of the image */
  position?: 'top' | 'bottom';
}

const CardImage = React.forwardRef<HTMLImageElement, CardImageProps>(
  ({ className, position = 'top', alt = '', ...props }, ref) => (
    <img
      ref={ref}
      alt={alt}
      className={cn(
        'w-full object-cover',
        position === 'top' && 'rounded-t-xl',
        position === 'bottom' && 'rounded-b-xl',
        className
      )}
      {...props}
    />
  )
);
CardImage.displayName = 'CardImage';

// ============================================================================
// Exports
// ============================================================================

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardImage,
  cardVariants,
};
