import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2
   font-medium transition-all duration-fast
   focus-visible:outline-none focus-visible:ring-2 
   focus-visible:ring-accent focus-visible:ring-offset-2
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]`,
  {
    variants: {
      variant: {
        default: `bg-accent text-white 
                  hover:bg-accent-hover 
                  active:bg-accent-active
                  shadow-sm hover:shadow-md`,
        primary: `bg-accent text-white 
                  hover:bg-accent-hover 
                  active:bg-accent-active
                  shadow-sm hover:shadow-md`,
        secondary: `bg-background-secondary text-foreground
                    border border-[var(--color-border-primary)]
                    hover:bg-background-tertiary
                    hover:border-[var(--color-border-secondary)]`,
        destructive: `bg-error text-white
                      hover:bg-error/90
                      shadow-sm`,
        outline: `border border-[var(--color-border-primary)] 
                  bg-transparent
                  hover:bg-background-secondary 
                  hover:text-foreground`,
        ghost: `hover:bg-background-secondary 
                hover:text-foreground`,
        link: `text-accent underline-offset-4 
               hover:underline
               active:scale-100`,
        success: `bg-success text-white
                  hover:bg-success/90
                  shadow-sm`,
      },
      size: {
        default: 'h-10 px-4 py-2 text-body rounded-lg',
        sm: 'h-8 px-3 text-callout rounded-md',
        md: 'h-10 px-4 text-body rounded-lg',
        lg: 'h-12 px-6 text-headline rounded-lg',
        xl: 'h-14 px-8 text-headline rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-lg': 'h-12 w-12 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { buttonVariants };
