import React, { useEffect, useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import UploadZone from '../components/UploadZone.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import { enrollIdentity } from '../api.js';

export default function EnrollPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null); // { type, message }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = (selected) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setBanner(null);
  };

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !name.trim()) {
      setBanner({ type: 'error', message: 'Please provide both a name and an image.' });
      return;
    }

    setLoading(true);
    setBanner(null);
    try {
      const res = await enrollIdentity(file, name.trim());
      const samples = res?.samples_count ? ` (${res.samples_count} sample(s) captured)` : '';
      setBanner({
        type: 'success',
        message: `${res?.message || `Successfully enrolled ${res?.enrolled_name || name.trim()}.`}${samples}`,
      });
      clearSelection();
      setName('');
    } catch (err) {
      setBanner({ type: 'error', message: err.message || 'Failed to enroll. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl animate-slide-up">
      <h1 className="text-headline-lg text-on-surface">Identity Enrollment</h1>
      <p className="mt-sm text-body-md text-on-surface-variant">
        Upload a clear, front-facing photo and provide a name to register a new identity.
      </p>

      <div className="mt-lg flat-card p-lg space-y-lg">
        {banner && (
          <StatusBanner type={banner.type} message={banner.message} onDismiss={() => setBanner(null)} />
        )}

        <UploadZone
          file={file}
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
          onClear={clearSelection}
        />

        <form onSubmit={handleSubmit} className="space-y-md">
          <div className="space-y-xs">
            <label htmlFor="name" className="block text-label-md text-on-surface">
              Subject Name
            </label>
            <input
              type="text"
              id="name"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-md py-sm rounded-lg input-flat text-body-md"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !file || !name.trim()}
            className="w-full btn-primary py-sm px-md rounded-lg flex items-center justify-center gap-sm text-body-md"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
            {loading ? 'Registering...' : 'Enroll Identity'}
          </button>
        </form>
      </div>
    </div>
  );
}
