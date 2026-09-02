import React, { useEffect, useState } from 'react';
import { Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import UploadZone from '../components/UploadZone.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import BoundingBoxOverlay from '../components/BoundingBoxOverlay.jsx';
import { recognizeFaces } from '../api.js';

export default function RecognizePage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [threshold, setThreshold] = useState(0.4);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [imageDims, setImageDims] = useState({ w: 0, h: 0 });
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (selected) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setResults([]);
    setBanner(null);
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setBanner({ type: 'error', message: 'Please upload an image to recognize.' });
      return;
    }

    setLoading(true);
    setBanner(null);
    setResults([]);
    try {
      const data = await recognizeFaces(file, threshold);
      const faces = Array.isArray(data) ? data : data?.predictions || data?.faces || [];
      setResults(faces);
      if (faces.length === 0) {
        setBanner({ type: 'info', message: 'No faces detected in the image.' });
      }
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Recognition failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl animate-slide-up">
      <h1 className="text-headline-lg text-on-surface">Live Verification</h1>
      <p className="mt-sm text-body-md text-on-surface-variant">
        Upload an image to detect faces and match them against enrolled identities.
      </p>

      <div className="mt-lg grid gap-lg lg:grid-cols-3">
        {/* Left: upload + controls */}
        <div className="lg:col-span-2 flat-card p-lg space-y-lg">
          {banner && (
            <StatusBanner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />
          )}

          <UploadZone
            file={file}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onClear={clearSelection}
            onImageLoad={setImageDims}
            overlay={<BoundingBoxOverlay faces={results} imageDims={imageDims} />}
          />

          <form onSubmit={handleSubmit} className="space-y-lg">
            <div className="space-y-xs">
              <div className="flex items-center justify-between">
                <label htmlFor="threshold" className="text-label-md text-on-surface">
                  Confidence Threshold
                </label>
                <span className="text-body-sm text-accent-brass font-medium">
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
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full range-accent"
              />
              <div className="flex justify-between text-caption text-on-surface-muted">
                <span>Loose</span>
                <span>Strict</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              className="w-full btn-primary py-sm px-md rounded-lg flex items-center justify-center gap-sm text-body-md"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {loading ? 'Analyzing...' : 'Recognize Faces'}
            </button>
          </form>
        </div>

        {/* Right: results panel */}
        <div className="flat-card p-lg h-fit">
          <h2 className="text-label-md text-on-surface mb-md">Match Results</h2>
          {results.length === 0 ? (
            <p className="text-body-sm text-on-surface-muted">
              Results will appear here after you run recognition.
            </p>
          ) : (
            <ul className="space-y-sm">
              {results.map((face, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-sm rounded-lg border border-border-subtle px-md py-sm"
                >
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-on-surface truncate">
                      {face.matched ? face.name || 'Match' : 'Unknown'}
                    </p>
                    {typeof face.similarity === 'number' && (
                      <p className="text-caption text-on-surface-muted">
                        {(face.similarity * 100).toFixed(1)}% confidence
                      </p>
                    )}
                  </div>
                  {face.matched ? (
                    <span className="shrink-0 inline-flex items-center gap-xs px-sm py-1 rounded-full bg-status-success-bg text-status-success text-caption font-semibold shadow-glow-success">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-xs px-sm py-1 rounded-full bg-status-error-bg text-status-error text-caption font-semibold shadow-glow-error">
                      <XCircle className="w-3.5 h-3.5" /> Denied
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
