import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Typography variants based on Apple HIG Type Scale
const typographyVariants = cva('', {
  variants: {
    variant: {
      display: 'text-display font-bold tracking-tight',
      'title-1': 'text-title-1 font-bold tracking-tight',
      'title-2': 'text-title-2 font-semibold',
      'title-3': 'text-title-3 font-semibold',
      headline: 'text-headline font-semibold',
      body: 'text-body',
      callout: 'text-callout',
      subhead: 'text-subhead',
      footnote: 'text-footnote',
      caption: 'text-caption',
      // Additional variants for flexibility
      small: 'text-[13px] leading-tight',
      large: 'text-[17px] leading-relaxed',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    textColor: {
      default: 'text-foreground',
      secondary: 'text-foreground-secondary',
      tertiary: 'text-foreground-tertiary',
      accent: 'text-accent',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
      muted: 'text-muted-foreground',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
    },
    truncate: {
      true: 'truncate',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body',
    weight: 'normal',
    textColor: 'default',
    align: 'left',
    truncate: false,
  },
});

type TypographyElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div' | 'label';

// Map variants to semantic HTML elements
const variantToElement: Record<string, TypographyElement> = {
  display: 'h1',
  'title-1': 'h1',
  'title-2': 'h2',
  'title-3': 'h3',
  headline: 'h4',
  body: 'p',
  callout: 'p',
  subhead: 'p',
  footnote: 'p',
  small: 'span',
  large: 'p',
  caption: 'span',
};

export interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyVariants> {
  as?: TypographyElement;
  children: React.ReactNode;
}

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ 
    className, 
    variant = 'body', 
    weight,
    textColor, 
    align, 
    truncate,
    as,
    children, 
    ...props 
  }, ref) => {
    const Element = as || variantToElement[variant || 'body'] || 'p';
    
    return React.createElement(
      Element,
      {
        ref,
        className: cn(typographyVariants({ variant, weight, textColor, align, truncate }), className),
        ...props,
      },
      children
    );
  }
);

Typography.displayName = 'Typography';

// Convenience components for common use cases
export const Display = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="display" {...props} />
);
Display.displayName = 'Display';

export const Title1 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="title-1" {...props} />
);
Title1.displayName = 'Title1';

export const Title2 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="title-2" {...props} />
);
Title2.displayName = 'Title2';

export const Title3 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="title-3" {...props} />
);
Title3.displayName = 'Title3';

export const Headline = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="headline" {...props} />
);
Headline.displayName = 'Headline';

export const Body = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="body" {...props} />
);
Body.displayName = 'Body';

export const Callout = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="callout" {...props} />
);
Callout.displayName = 'Callout';

export const Subhead = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="subhead" {...props} />
);
Subhead.displayName = 'Subhead';

export const Footnote = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="footnote" {...props} />
);
Footnote.displayName = 'Footnote';

export const Caption = React.forwardRef<HTMLSpanElement, Omit<TypographyProps, 'variant'>>(
  (props, ref) => <Typography ref={ref} variant="caption" {...props} />
);
Caption.displayName = 'Caption';

// Alias for Body - more semantic naming
export const Text = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ variant = 'body', ...props }, ref) => <Typography ref={ref} variant={variant} {...props} />
);
Text.displayName = 'Text';

export { typographyVariants };
