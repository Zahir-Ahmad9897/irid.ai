import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

/**
 * Inline feedback banner shown instead of browser alerts.
 *
 * @param {Object} props
 * @param {'success'|'error'|'info'} props.type - Visual style / icon of the banner.
 * @param {string} props.message - Message text to display.
 * @param {() => void} [props.onDismiss] - Optional dismiss handler; renders a close button when provided.
 */
export default function StatusBanner({ type = 'info', message, onDismiss }) {
  if (!message) return null;

  const styles = {
    success: {
      bg: 'bg-status-success-bg',
      text: 'text-status-success',
      border: 'border-l-2 border-status-success-border',
      Icon: CheckCircle2,
    },
    error: {
      bg: 'bg-status-error-bg',
      text: 'text-status-error',
      border: 'border-l-2 border-status-error-border',
      Icon: AlertCircle,
    },
    info: {
      bg: 'bg-status-info-bg',
      text: 'text-status-info',
      border: 'border-l-2 border-status-info-border',
      Icon: Info,
    },
  };

  const { bg, text, border, Icon } = styles[type] || styles.info;

  return (
    <div className={`flex items-start gap-sm rounded-lg px-md py-sm ${bg} ${text} ${border} animate-fade-in`} role="status">
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-body-sm font-medium flex-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
