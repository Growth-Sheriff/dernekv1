import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Tabs Root
// ============================================================================

const Tabs = TabsPrimitive.Root;

// ============================================================================
// TabsList - Container for tab triggers
// ============================================================================

const tabsListVariants = cva(
  'inline-flex items-center justify-center',
  {
    variants: {
      variant: {
        // Default: Segmented control style (macOS)
        default: [
          'h-9 p-1 rounded-lg',
          'bg-muted/60 backdrop-blur-sm',
          'border border-border/50',
        ],
        // Underline: Traditional tab style
        underline: [
          'h-10 gap-1',
          'border-b border-border',
          'bg-transparent',
        ],
        // Pills: Separated pill buttons
        pills: [
          'h-9 gap-1',
          'bg-transparent',
        ],
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      fullWidth: false,
    },
  }
);

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant, fullWidth, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(tabsListVariants({ variant, fullWidth }), className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

// ============================================================================
// TabsTrigger - Individual tab button
// ============================================================================

const tabsTriggerVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap',
    'text-sm font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        // Segmented control style
        default: [
          'h-7 px-3 rounded-md',
          'text-muted-foreground',
          'hover:text-foreground',
          'data-[state=active]:bg-background',
          'data-[state=active]:text-foreground',
          'data-[state=active]:shadow-sm',
          'data-[state=active]:border data-[state=active]:border-border/50',
        ],
        // Underline style
        underline: [
          'h-10 px-4 -mb-px',
          'text-muted-foreground',
          'border-b-2 border-transparent',
          'hover:text-foreground hover:border-border',
          'data-[state=active]:text-foreground',
          'data-[state=active]:border-primary',
        ],
        // Pill style
        pills: [
          'h-8 px-4 rounded-full',
          'text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
          'data-[state=active]:bg-primary',
          'data-[state=active]:text-primary-foreground',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {
  /** Optional icon to show before label */
  icon?: React.ReactNode;
  /** Optional badge/count to show after label */
  badge?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, variant, icon, badge, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(tabsTriggerVariants({ variant }), className)}
    {...props}
  >
    {icon && <span className="mr-2 h-4 w-4">{icon}</span>}
    {children}
    {badge && <span className="ml-2">{badge}</span>}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// ============================================================================
// TabsContent - Tab panel content
// ============================================================================

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 ring-offset-background',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      // Animation
      'data-[state=inactive]:animate-out data-[state=inactive]:fade-out-0',
      'data-[state=active]:animate-in data-[state=active]:fade-in-0',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ============================================================================
// Exports
// ============================================================================

export { Tabs, TabsList, TabsTrigger, TabsContent };
