import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X, WifiOff, AlertTriangle } from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────
 * Toast notification center — stackable, auto-dismissing, ARIA live.
 * ──────────────────────────────────────────────────────────────────── */
const ToastContext = createContext(null);
let toastSeq = 0;

const TOAST_STYLES = {
  success: { text: 'text-status-success', bg: 'bg-status-success-bg', border: 'border-status-success-border', Icon: CheckCircle2 },
  error: { text: 'text-status-error', bg: 'bg-status-error-bg', border: 'border-status-error-border', Icon: AlertCircle },
  info: { text: 'text-status-info', bg: 'bg-status-info-bg', border: 'border-status-info-border', Icon: Info },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 5000) => {
      const id = ++toastSeq;
      setToasts((t) => [...t, { id, message, type }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      push,
      dismiss,
      success: (msg, d) => push(msg, 'success', d),
      error: (msg, d) => push(msg, 'error', d ?? 7000),
      info: (msg, d) => push(msg, 'info', d),
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="fixed top-lg right-lg z-[100] flex flex-col gap-sm w-full max-w-sm pointer-events-none"
          role="region"
          aria-label="Notifications"
        >
          {toasts.map((toast) => {
            const { text, bg, border, Icon } = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
            return (
              <div
                key={toast.id}
                role="status"
                aria-live="polite"
                className={`pointer-events-auto flex items-start gap-sm rounded-lg px-md py-sm flat-card ${bg} ${text} border-l-2 ${border} animate-slide-up shadow-level-3`}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-body-sm font-medium flex-1">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 min-w-[24px] min-h-[24px] opacity-70 hover:opacity-90 transition-all duration-150 ease-in-out motion-reduce:transition-none active:scale-95 cursor-pointer"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/* ────────────────────────────────────────────────────────────────────
 * Global "Network Disconnected" banner
 * ──────────────────────────────────────────────────────────────────── */
export function NetworkBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-sm py-2 bg-status-error text-on-primary text-body-sm font-semibold"
    >
      <WifiOff className="w-4 h-4" />
      Network disconnected — changes may not be saved.
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Modal — accessible dialog with focus trap-lite (Escape to close, click backdrop)
 * ──────────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${widths[size]} flat-card p-lg animate-slide-up outline-none`}
      >
        <div className="flex items-start justify-between gap-md mb-md">
          <h2 className="text-headline-md text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 min-w-[24px] min-h-[24px] p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-hover transition-all duration-150 ease-in-out motion-reduce:transition-none active:scale-95 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-lg flex justify-end gap-sm">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Destructive-action confirmation modal (Fitts's Law: large, clearly
 * separated confirm/cancel targets).
 */
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', busy = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[110px] min-h-[44px] px-6 py-sm rounded-lg text-body-sm font-medium text-on-surface-variant border border-border-subtle hover:bg-surface-hover hover:opacity-90 transition-all duration-150 ease-in-out motion-reduce:transition-none active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-disabled={busy}
            className="min-w-[110px] min-h-[44px] px-6 py-sm rounded-lg text-body-sm font-semibold bg-status-error text-white hover:brightness-110 hover:opacity-90 transition-all duration-150 ease-in-out motion-reduce:transition-none active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-sm">
        <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
        <p className="text-body-sm text-on-surface-variant">{message}</p>
      </div>
    </Modal>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Skeleton loaders
 * ──────────────────────────────────────────────────────────────────── */
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-surface-hover ${className}`} />;
}

export function SkeletonRow({ cols = 4 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-md py-sm">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="flat-card p-lg space-y-sm">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
