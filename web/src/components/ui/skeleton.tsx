import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const skeletonVariants = cva(
  'animate-pulse bg-background-tertiary',
  {
    variants: {
      variant: {
        default: 'rounded',
        text: 'h-4 w-full rounded',
        title: 'h-6 w-3/4 rounded',
        avatar: 'rounded-full',
        button: 'h-10 w-24 rounded-lg',
        card: 'h-32 w-full rounded-xl',
        table: 'h-12 w-full rounded',
        input: 'h-10 w-full rounded-lg',
        badge: 'h-6 w-16 rounded-full',
        thumbnail: 'aspect-video rounded-lg',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    compoundVariants: [
      { variant: 'avatar', size: 'sm', className: 'h-8 w-8' },
      { variant: 'avatar', size: 'md', className: 'h-10 w-10' },
      { variant: 'avatar', size: 'lg', className: 'h-12 w-12' },
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Convenience skeleton components

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton 
        key={i} 
        variant="text" 
        className={i === lines - 1 ? 'w-2/3' : 'w-full'} 
      />
    ))}
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 space-y-3 border border-[var(--color-border-primary)] rounded-xl', className)}>
    <Skeleton variant="title" />
    <SkeletonText lines={2} />
    <div className="flex gap-2">
      <Skeleton variant="badge" />
      <Skeleton variant="badge" />
    </div>
  </div>
);

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ 
  rows = 5, 
  columns = 4,
  className 
}) => (
  <div className={cn('space-y-2', className)}>
    {/* Header */}
    <div className="flex gap-4 p-3 bg-background-secondary rounded-lg">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} variant="text" className="flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex gap-4 p-3">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton 
            key={colIndex} 
            variant="text" 
            className={cn(
              'flex-1',
              colIndex === 0 && 'w-1/4',
              colIndex === columns - 1 && 'w-20'
            )} 
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md',
  className 
}) => (
  <Skeleton variant="avatar" size={size} className={className} />
);

export const SkeletonStatCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-4 space-y-2 border border-[var(--color-border-primary)] rounded-xl', className)}>
    <div className="flex items-center justify-between">
      <Skeleton variant="text" className="w-24" />
      <Skeleton variant="avatar" size="sm" />
    </div>
    <Skeleton variant="title" className="w-20" />
    <Skeleton variant="text" className="w-32" />
  </div>
);

export { skeletonVariants };
