import React from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { Modal } from './ui.jsx';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   devices: MediaDeviceInfo[],
 *   deviceId: string|null,
 *   onSelect: (id:string) => void,
 *   status: string,
 *   error: string|null,
 *   onRetry: () => void,
 * }} props
 */
export default function DeviceSettingsModal({ open, onClose, devices, deviceId, onSelect, status, error, onRetry }) {
  return (
    <Modal open={open} onClose={onClose} title="Camera settings" size="sm">
      <div className="space-y-md">
        {error && (
          <div className="flex items-start gap-sm rounded-lg px-md py-sm bg-status-error-bg text-status-error border-l-2 border-status-error-border">
            <p className="text-body-sm">{error}</p>
          </div>
        )}

        {devices.length === 0 ? (
          <p className="text-body-sm text-on-surface-muted">
            No cameras detected yet. Grant permission, then reconnect a device if needed.
          </p>
        ) : (
          <div className="space-y-sm">
            {devices.map((d, i) => (
              <button
                key={d.deviceId}
                type="button"
                onClick={() => onSelect(d.deviceId)}
                className={`w-full flex items-center gap-sm min-h-[48px] px-md py-sm rounded-lg border text-left transition-colors ${
                  d.deviceId === deviceId
                    ? 'border-accent-cyan bg-primary-soft text-on-surface'
                    : 'border-border-subtle text-on-surface-variant hover:bg-surface-hover'
                }`}
              >
                <Camera className="w-4 h-4 shrink-0" />
                <span className="text-body-sm truncate">{d.label || `Camera ${i + 1}`}</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onRetry}
          className="w-full inline-flex items-center justify-center gap-sm min-h-[44px] px-md py-sm rounded-lg border border-border-subtle text-body-sm font-medium text-on-surface hover:bg-surface-hover transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          {status === 'requesting' ? 'Requesting access…' : 'Retry camera access'}
        </button>
      </div>
    </Modal>
  );
}
