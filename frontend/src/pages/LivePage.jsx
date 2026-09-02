import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Video, VideoOff, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { useCamera } from '../hooks/useCamera.js';
import { useUndoRedo } from '../hooks/useUndoRedo.js';
import { recognizeFaces } from '../api.js';
import BoundingBoxOverlay from '../components/BoundingBoxOverlay.jsx';
import DeviceSettingsModal from '../components/DeviceSettingsModal.jsx';
import { useToast } from '../components/ui.jsx';

const SCAN_INTERVAL_MS = 1800;
const MATCH_COLOR = '#34d399'; // emerald
const UNKNOWN_COLOR = '#fb7185'; // rose

export default function LivePage() {
  const toast = useToast();
  const { videoRef, devices, deviceId, setDeviceId, status, error, start, stop } = useCamera();
  const canvasRef = useRef(null);
  const scanTimer = useRef(null);

  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [rawFaces, setRawFaces] = useState([]); // faces as last returned by backend (with similarity)
  const [scanning, setScanning] = useState(false);
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });

  // Threshold slider gets its own undo/redo history — the requirement is a
  // general navigation/forms history hook, applied here to the control most
  // in need of "step back" (accidental drags on a security-sensitive value).
  const thresholdHistory = useUndoRedo(0.45);
  const threshold = thresholdHistory.state;

  useEffect(() => {
    start();
    return () => {
      stop();
      if (scanTimer.current) clearInterval(scanTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Periodically capture a frame and send it for recognition.
  useEffect(() => {
    if (status !== 'active') return undefined;

    const tick = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setVideoDims({ w: video.videoWidth, h: video.videoHeight });
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        setScanning(true);
        try {
          const data = await recognizeFaces(blob, threshold);
          const faces = Array.isArray(data) ? data : data?.predictions || data?.faces || [];
          setRawFaces(faces);
        } catch {
          // Silently skip a failed frame — the live feed keeps running and
          // the next interval tick will retry.
        } finally {
          setScanning(false);
        }
      }, 'image/jpeg', 0.85);
    };

    tick();
    scanTimer.current = setInterval(tick, SCAN_INTERVAL_MS);
    return () => clearInterval(scanTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Re-derive match/unknown in real time as the slider moves, without
  // waiting for the next network round trip.
  const faces = useMemo(
    () =>
      rawFaces.map((f) => ({
        ...f,
        matched: typeof f.similarity === 'number' ? f.similarity >= threshold : !!f.matched,
      })),
    [rawFaces, threshold]
  );

  const matchCount = faces.filter((f) => f.matched).length;

  return (
    <div className="max-w-5xl animate-slide-up">
      <div className="flex items-center justify-between gap-md mb-md">
        <div>
          <h1 className="text-headline-lg text-on-surface">Live Video Recognition</h1>
          <p className="text-body-sm text-on-surface-variant">
            Real-time detection from your camera, matched against enrolled identities.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDeviceModalOpen(true)}
          className="shrink-0 inline-flex items-center gap-sm min-h-[44px] px-md py-2 rounded-lg border border-border-subtle text-body-sm font-medium text-on-surface hover:bg-surface-hover transition-colors"
        >
          <Settings className="w-4 h-4" />
          Camera settings
        </button>
      </div>

      <div className="grid gap-lg lg:grid-cols-3">
        <div className="lg:col-span-2 flat-card p-lg space-y-lg">
          <div className="relative rounded-xl overflow-hidden border border-border-subtle bg-surface-base aspect-video flex items-center justify-center">
            {status === 'active' ? (
              <>
                <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
                <BoundingBoxOverlay faces={faces} imageDims={videoDims} matchColor={MATCH_COLOR} unknownColor={UNKNOWN_COLOR} />
                {scanning && (
                  <span className="absolute top-3 right-3 flex items-center gap-xs text-caption text-accent-brass bg-surface-elevated/80 px-sm py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-glow-pulse" />
                    Scanning
                  </span>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-sm text-on-surface-muted p-lg text-center">
                <VideoOff className="w-8 h-8" />
                <p className="text-body-sm">
                  {status === 'requesting' ? 'Requesting camera access…' : error || 'Camera is off.'}
                </p>
                <button
                  type="button"
                  onClick={() => start(deviceId)}
                  className="mt-sm btn-primary min-h-[40px] px-md rounded-lg text-body-sm font-medium inline-flex items-center gap-sm"
                >
                  <Video className="w-4 h-4" />
                  Start camera
                </button>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold" className="text-label-md text-on-surface">
                Confidence Threshold
              </label>
              <span className="text-body-sm font-medium" style={{ color: MATCH_COLOR }}>
                {threshold.toFixed(2)}
              </span>
            </div>
            <input
              id="threshold"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={threshold}
              onChange={(e) => thresholdHistory.set(parseFloat(e.target.value), { commit: false })}
              onMouseUp={thresholdHistory.commit}
              onTouchEnd={thresholdHistory.commit}
              className="w-full range-accent"
            />
            <div className="flex items-center justify-between text-caption text-on-surface-muted">
              <span>Loose</span>
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={thresholdHistory.undo}
                  disabled={!thresholdHistory.canUndo}
                  className="underline decoration-dotted disabled:opacity-30 disabled:no-underline"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={thresholdHistory.redo}
                  disabled={!thresholdHistory.canRedo}
                  className="underline decoration-dotted disabled:opacity-30 disabled:no-underline"
                >
                  Redo
                </button>
              </div>
              <span>Strict</span>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="flat-card p-lg h-fit">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-label-md text-on-surface">Detections</h2>
            <span className="text-caption text-on-surface-muted">{matchCount} matched</span>
          </div>
          {faces.length === 0 ? (
            <p className="text-body-sm text-on-surface-muted">No faces in frame right now.</p>
          ) : (
            <ul className="space-y-sm">
              {faces.map((face, idx) => (
                <li key={idx} className="flex items-center justify-between gap-sm rounded-lg border border-border-subtle px-md py-sm">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-on-surface truncate">
                      {face.matched ? face.name || 'Match' : 'Unknown'}
                    </p>
                    {typeof face.similarity === 'number' && (
                      <p className="text-caption text-on-surface-muted">{(face.similarity * 100).toFixed(1)}%</p>
                    )}
                  </div>
                  {face.matched ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: MATCH_COLOR }} />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0" style={{ color: UNKNOWN_COLOR }} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DeviceSettingsModal
        open={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        devices={devices}
        deviceId={deviceId}
        onSelect={(id) => {
          setDeviceId(id);
          start(id);
          setDeviceModalOpen(false);
          toast.info('Switched camera.');
        }}
        status={status}
        error={error}
        onRetry={() => start(deviceId)}
      />
    </div>
  );
}
