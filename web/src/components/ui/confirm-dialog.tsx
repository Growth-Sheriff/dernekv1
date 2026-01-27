import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Info, HelpCircle, Loader2 } from 'lucide-react';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'question';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

const variantStyles: Record<ConfirmDialogVariant, {
  icon: React.ReactNode;
  buttonClass: string;
}> = {
  danger: {
    icon: <Trash2 className="h-6 w-6 text-red-600" />,
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    buttonClass: 'bg-yellow-600 hover:bg-yellow-700 text-white',
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-600" />,
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  question: {
    icon: <HelpCircle className="h-6 w-6 text-gray-600" />,
    buttonClass: 'bg-gray-800 hover:bg-gray-900 text-white',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  variant = 'question',
  onConfirm,
  loading = false,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const styles = variantStyles[variant];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading && !loading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 rounded-full bg-gray-100">
              {styles.icon}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-gray-600">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading || loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || loading}
            className={styles.buttonClass}
          >
            {(isLoading || loading) ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                İşleniyor...
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook for easier usage
interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
}

interface UseConfirmDialogReturn {
  confirm: () => Promise<boolean>;
  ConfirmDialogComponent: React.FC;
}

export function useConfirmDialog(options: UseConfirmDialogOptions): UseConfirmDialogReturn {
  const [open, setOpen] = React.useState(false);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setOpen(true);
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    setOpen(false);
  }, []);

  const handleCancel = React.useCallback((isOpen: boolean) => {
    if (!isOpen) {
      resolveRef.current?.(false);
    }
    setOpen(isOpen);
  }, []);

  const ConfirmDialogComponent: React.FC = React.useCallback(() => (
    <ConfirmDialog
      open={open}
      onOpenChange={handleCancel}
      onConfirm={handleConfirm}
      {...options}
    />
  ), [open, handleCancel, handleConfirm, options]);

  return { confirm, ConfirmDialogComponent };
}

export default ConfirmDialog;
