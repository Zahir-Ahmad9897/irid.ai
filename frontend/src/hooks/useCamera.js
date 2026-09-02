import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages a getUserMedia video stream: device enumeration, start/stop,
 * device switching, and permission/error surfacing.
 *
 * @returns {{
 *   videoRef: React.RefObject<HTMLVideoElement>,
 *   devices: MediaDeviceInfo[],
 *   deviceId: string|null,
 *   setDeviceId: (id:string) => void,
 *   status: 'idle'|'requesting'|'active'|'error',
 *   error: string|null,
 *   start: () => Promise<void>,
 *   stop: () => void,
 * }}
 */
export function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    } catch {
      // Device labels may be empty until permission is granted; ignore.
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  const start = useCallback(
    async (preferredDeviceId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError('This browser does not support camera access.');
        return;
      }
      setStatus('requesting');
      setError(null);
      try {
        stop();
        const constraints = {
          video: preferredDeviceId
            ? { deviceId: { exact: preferredDeviceId } }
            : { facingMode: 'user' },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const track = stream.getVideoTracks()[0];
        if (track) setDeviceId(track.getSettings().deviceId || preferredDeviceId || null);
        setStatus('active');
        await refreshDevices();
      } catch (err) {
        setStatus('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Camera access was denied. Allow permission in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera device was found.');
        } else {
          setError(err.message || 'Could not start the camera.');
        }
      }
    },
    [refreshDevices, stop]
  );

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshDevices);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { videoRef, devices, deviceId, setDeviceId, status, error, start, stop };
}
