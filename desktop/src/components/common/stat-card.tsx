import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { SkeletonStatCard } from '@/components/ui/skeleton';

export interface StatCardProps {
  /** Card title/label */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Optional description */
  description?: string;
  /** Icon to display */
  icon?: LucideIcon;
  /** Trend indicator */
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label?: string;
  };
  /** Color variant */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom className */
  className?: string;
}

const variantStyles = {
  default: {
    icon: 'text-foreground-secondary bg-background-secondary',
    trend: {
      up: 'text-success',
      down: 'text-error',
    },
  },
  primary: {
    icon: 'text-accent bg-accent/10',
    trend: {
      up: 'text-success',
      down: 'text-error',
    },
  },
  success: {
    icon: 'text-success bg-success-light',
    trend: {
      up: 'text-success',
      down: 'text-error',
    },
  },
  warning: {
    icon: 'text-warning bg-warning-light',
    trend: {
      up: 'text-success',
      down: 'text-error',
    },
  },
  error: {
    icon: 'text-error bg-error-light',
    trend: {
      up: 'text-success',
      down: 'text-error',
    },
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  loading = false,
  onClick,
  className,
}) => {
  if (loading) {
    return <SkeletonStatCard className={className} />;
  }

  const styles = variantStyles[variant];
  const isClickable = !!onClick;

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      // Format large numbers
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString('tr-TR');
    }
    return val;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border border-[var(--color-border-primary)]',
        'bg-[var(--color-bg-primary)]',
        'transition-all duration-fast',
        isClickable && [
          'cursor-pointer',
          'hover:shadow-md hover:border-[var(--color-border-secondary)]',
          'active:scale-[0.98]',
        ],
        className
      )}
    >
      {/* Header: Title & Icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-callout text-foreground-secondary font-medium">
          {title}
        </span>
        {Icon && (
          <div className={cn('p-2 rounded-lg', styles.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="text-title-1 font-bold text-foreground mb-1">
        {formatValue(value)}
      </div>

      {/* Footer: Description & Trend */}
      <div className="flex items-center justify-between">
        {description && (
          <span className="text-footnote text-foreground-tertiary">
            {description}
          </span>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-footnote font-medium',
              styles.trend[trend.direction]
            )}
          >
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>
              {trend.direction === 'up' ? '+' : '-'}
              {Math.abs(trend.value)}%
            </span>
            {trend.label && (
              <span className="text-foreground-tertiary ml-1">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Grid layout helper
export interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export const StatCardGrid: React.FC<StatCardGridProps> = ({
  children,
  columns = 4,
  className,
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
};
