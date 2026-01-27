import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, LucideIcon } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Page description */
  description?: string;
  /** Icon component from lucide-react */
  icon?: LucideIcon;
  /** Breadcrumb navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons on the right */
  actions?: React.ReactNode;
  /** Show back button */
  backHref?: string;
  /** Custom className */
  className?: string;
  /** Children for tabs or additional content */
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
  backHref,
  className,
  children,
}) => {
  return (
    <div className={cn('mb-6', className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-callout text-foreground-secondary mb-3">
          <Link
            to="/"
            className="hover:text-foreground transition-colors flex items-center"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3.5 w-3.5 text-foreground-tertiary" />
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {/* Icon */}
            {Icon && (
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              {/* Title */}
              <h1 className="text-title-1 font-bold text-foreground truncate">
                {title}
              </h1>

              {/* Description */}
              {description && (
                <p className="mt-1 text-body text-foreground-secondary">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Children (tabs, filters, etc.) */}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

// Compact variant for detail pages
export interface PageHeaderCompactProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeaderCompact: React.FC<PageHeaderCompactProps> = ({
  title,
  subtitle,
  backHref,
  actions,
  badge,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div className="flex items-center gap-3">
        {backHref && (
          <Link
            to={backHref}
            className="p-2 -ml-2 rounded-lg hover:bg-background-secondary transition-colors"
          >
            <ChevronRight className="h-5 w-5 rotate-180 text-foreground-secondary" />
          </Link>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-title-2 font-semibold text-foreground">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-callout text-foreground-secondary">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
};

export default PageHeader;
