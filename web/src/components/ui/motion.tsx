import { motion, type Variants, type MotionProps } from 'framer-motion';
import React from 'react';

// ============================================================================
// Animation Variants - Apple HIG inspired
// ============================================================================

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

export const fadeInLeft: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

export const fadeInRight: Variants = {
  initial: { opacity: 0, x: 10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideInRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
};

export const slideInLeft: Variants = {
  initial: { x: '-100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '-100%', opacity: 0 },
};

// Staggered children animation
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

// ============================================================================
// Animation Presets - Apple-like spring physics
// ============================================================================

export const springTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
} as const;

export const smoothTransition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1], // Apple's easing curve
} as const;

export const fastTransition = {
  type: 'tween',
  duration: 0.15,
  ease: 'easeOut',
} as const;

// ============================================================================
// Motion Components
// ============================================================================

interface AnimatedProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * FadeIn - Simple fade animation
 */
export const FadeIn: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={fadeIn}
    transition={smoothTransition}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * FadeInUp - Fade in with upward movement
 */
export const FadeInUp: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={fadeInUp}
    transition={smoothTransition}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * ScaleIn - Scale and fade animation
 */
export const ScaleIn: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    initial="initial"
    animate="animate"
    exit="exit"
    variants={scaleIn}
    transition={springTransition}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * StaggerList - Container for staggered list animations
 */
export const StaggerList: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    initial="initial"
    animate="animate"
    variants={staggerContainer}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * StaggerItem - Individual item in a staggered list
 */
export const StaggerItem: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    variants={staggerItem}
    transition={smoothTransition}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * PageTransition - Page-level transition wrapper
 */
export const PageTransition: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{
      type: 'tween',
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * Hover animation for interactive elements
 */
export const HoverScale: React.FC<AnimatedProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    transition={springTransition}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/**
 * AnimatePresence wrapper for conditional rendering
 */
export { AnimatePresence } from 'framer-motion';

// Re-export motion for custom usage
export { motion };
