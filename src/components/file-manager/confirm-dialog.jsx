'use client';

import { cx } from '@/utils/cx';
import { Button } from '@/components/base/buttons/button';
import { RiDeleteBinLine } from '@remixicon/react';

/**
 * Confirmation dialog for destructive operations
 * @param {Object} props
 * @param {boolean} props.open - Whether dialog is visible
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Confirmation message
 * @param {string} props.confirmLabel - Confirm button label
 * @param {() => void} props.onConfirm - Confirm callback
 * @param {() => void} props.onCancel - Cancel callback
 * @param {boolean} props.loading - Loading state
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background-full/50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={cx(
          'relative z-10 max-w-md w-full mx-4 p-6 rounded-3xl',
          'bg-background-primary-default border border-border-button-default',
          'shadow-xl'
        )}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-text-error-primary/10">
          <RiDeleteBinLine className="w-6 h-6 text-text-error-primary" />
        </div>

        {/* Title */}
        <h3 className="text-title-3-semibold text-text-primary mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-body-regular text-text-secondary mb-6">{message}</p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="ghost"
            size="medium"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="medium"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
