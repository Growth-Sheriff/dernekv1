import React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster, type ExternalToast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

// Toast Provider Component
export const Toaster = () => (
  <SonnerToaster
    position="bottom-right"
    expand={false}
    richColors
    closeButton
    toastOptions={{
      className: `
        bg-[var(--color-bg-elevated)] 
        border border-[var(--color-border-primary)]
        shadow-lg rounded-xl p-4
        text-foreground
      `,
      duration: 4000,
    }}
  />
);

// Toast Utility Functions
export const toast = {
  /**
   * Show a success toast
   */
  success: (message: string, options?: ExternalToast) => 
    sonnerToast.success(message, {
      ...options,
      icon: <CheckCircle className="h-5 w-5 text-success" />,
    }),

  /**
   * Show an error toast
   */
  error: (message: string, options?: ExternalToast) => 
    sonnerToast.error(message, {
      ...options,
      icon: <XCircle className="h-5 w-5 text-error" />,
    }),

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: ExternalToast) => 
    sonnerToast.warning(message, {
      ...options,
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    }),

  /**
   * Show an info toast
   */
  info: (message: string, options?: ExternalToast) => 
    sonnerToast.info(message, {
      ...options,
      icon: <Info className="h-5 w-5 text-info" />,
    }),

  /**
   * Show a loading toast
   */
  loading: (message: string, options?: ExternalToast) => 
    sonnerToast.loading(message, options),

  /**
   * Show a promise toast (loading -> success/error)
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: { 
      loading: string; 
      success: string | ((data: T) => string); 
      error: string | ((error: unknown) => string);
    }
  ) => sonnerToast.promise(promise, messages),

  /**
   * Show a custom toast
   */
  custom: (content: React.ReactElement, options?: ExternalToast) => 
    sonnerToast.custom(() => content, options),

  /**
   * Dismiss a toast by ID
   */
  dismiss: (toastId?: string | number) => 
    sonnerToast.dismiss(toastId),

  /**
   * Dismiss all toasts
   */
  dismissAll: () => 
    sonnerToast.dismiss(),
};

// Legacy Toast component (for backward compatibility)
export const Toast: React.FC<{ children?: React.ReactNode }> = () => {
  return null; // This component is no longer used directly
};
