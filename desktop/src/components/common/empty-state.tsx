import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, FileQuestion } from 'lucide-react';

export interface EmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Action button or element */
  action?: React.ReactNode;
  /** Additional content */
  children?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom className */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  children,
  size = 'md',
  className,
}) => {
  const sizeClasses = {
    sm: {
      container: 'py-6 px-4',
      icon: 'h-8 w-8',
      title: 'text-body',
      description: 'text-callout',
    },
    md: {
      container: 'py-12 px-6',
      icon: 'h-12 w-12',
      title: 'text-title-3',
      description: 'text-body',
    },
    lg: {
      container: 'py-16 px-8',
      icon: 'h-16 w-16',
      title: 'text-title-2',
      description: 'text-headline',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      {/* Icon */}
      <div className="mb-4 rounded-full bg-background-secondary p-4">
        <Icon className={cn('text-foreground-tertiary', sizes.icon)} />
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-foreground mb-2', sizes.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-foreground-secondary max-w-sm mb-6', sizes.description)}>
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-2">{action}</div>}

      {/* Children */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

// Convenience variants

export interface EmptySearchStateProps {
  query?: string;
  onClear?: () => void;
  className?: string;
}

export const EmptySearchState: React.FC<EmptySearchStateProps> = ({
  query,
  onClear,
  className,
}) => (
  <EmptyState
    icon={FileQuestion}
    title="Sonuç bulunamadı"
    description={
      query
        ? `"${query}" için sonuç bulunamadı. Farklı bir arama terimi deneyin.`
        : 'Arama kriterlerinize uygun sonuç bulunamadı.'
    }
    action={
      onClear && (
        <button
          onClick={onClear}
          className="text-accent hover:underline text-callout"
        >
          Aramayı temizle
        </button>
      )
    }
    className={className}
  />
);

export interface EmptyListStateProps {
  itemName: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export const EmptyListState: React.FC<EmptyListStateProps> = ({
  itemName,
  action,
  icon,
  className,
}) => (
  <EmptyState
    icon={icon}
    title={`Henüz ${itemName} yok`}
    description={`Başlamak için ilk ${itemName.toLowerCase()} ekleyin.`}
    action={action}
    className={className}
  />
);
