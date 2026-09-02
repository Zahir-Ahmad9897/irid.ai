import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, XCircle, Loader2, Layers, X } from 'lucide-react';
import { enrollIdentityWithProgress } from '../api.js';
import { useToast } from '../components/ui.jsx';

function nameFromFilename(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

let idSeq = 0;

export default function BulkEnrollPage() {
  const toast = useToast();
  const [items, setItems] = useState([]); // {id, file, name, progress, status, error}
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback((fileList) => {
    const accepted = Array.from(fileList).filter((f) => /^image\/(jpeg|jpg|png)$/.test(f.type));
    if (accepted.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: ++idSeq,
        file,
        name: nameFromFilename(file.name),
        progress: 0,
        status: 'pending', // pending | encoding | done | error
        error: null,
      })),
    ]);
  }, []);

  const updateItem = (id, patch) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const runEnrollment = async () => {
    const pending = items.filter((it) => it.status === 'pending' || it.status === 'error');
    for (const item of pending) {
      updateItem(item.id, { status: 'encoding', progress: 0, error: null });
      try {
        // eslint-disable-next-line no-await-in-loop
        await enrollIdentityWithProgress(item.file, item.name, (pct) =>
          updateItem(item.id, { progress: pct })
        );
        updateItem(item.id, { status: 'done', progress: 100 });
      } catch (err) {
        updateItem(item.id, { status: 'error', error: err.message || 'Enrollment failed.' });
      }
    }
    const failed = items.filter((it) => it.status === 'error').length;
    if (failed === 0) toast.success('Bulk enrollment complete.');
    else toast.error(`${failed} file(s) failed to enroll — retry below.`);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const doneCount = items.filter((it) => it.status === 'done').length;
  const canRun = items.some((it) => it.status === 'pending' || it.status === 'error');
  const isRunning = items.some((it) => it.status === 'encoding');

  return (
    <div className="max-w-3xl animate-slide-up">
      <div className="flex items-center gap-md mb-md">
        <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center">
          <Layers className="w-5 h-5 text-accent-brass" />
        </div>
        <div>
          <h1 className="text-headline-lg text-on-surface">Bulk Enrollment</h1>
          <p className="text-body-sm text-on-surface-variant">
            Drop a batch of photos to enroll many identities at once. Names are inferred from filenames — edit
            before running.
          </p>
        </div>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        className={`flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300
          ${isDragActive ? 'border-accent-cyan bg-primary-soft' : 'border-border-subtle-light bg-surface-base hover:bg-surface-hover hover:border-border-subtle-hover'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="p-4 rounded-full bg-surface-elevated border border-border-subtle mb-md">
          <UploadCloud className="w-8 h-8 text-on-surface-variant" strokeWidth={1.5} />
        </div>
        <p className="text-on-surface font-medium text-body-md">Drag &amp; drop a batch of photos, or click to browse</p>
        <p className="text-on-surface-muted text-body-sm mt-xs">JPG or PNG, one face per photo.</p>
      </div>

      {items.length > 0 && (
        <div className="mt-lg flat-card divide-y divide-glass-border overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-md px-md py-sm">
              <div className="shrink-0">
                {item.status === 'done' && <CheckCircle2 className="w-5 h-5 text-status-success" />}
                {item.status === 'error' && <XCircle className="w-5 h-5 text-status-error" />}
                {item.status === 'encoding' && <Loader2 className="w-5 h-5 text-accent-brass animate-spin" />}
                {item.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-border-subtle-light" />}
              </div>

              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={item.name}
                  disabled={item.status === 'encoding' || item.status === 'done'}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  className="w-full bg-transparent text-body-sm font-medium text-on-surface border-b border-transparent focus:border-accent-cyan outline-none disabled:opacity-70"
                />
                <div className="mt-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${item.status === 'error' ? 'bg-status-error' : 'bg-gradient-to-r from-accent-cyan to-accent-violet'}`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                {item.error && <p className="text-caption text-status-error mt-1">{item.error}</p>}
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                disabled={item.status === 'encoding'}
                className="shrink-0 p-2 rounded-full text-on-surface-muted hover:text-on-surface hover:bg-surface-hover transition-colors disabled:opacity-30"
                aria-label={`Remove ${item.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-md flex items-center justify-between">
          <p className="text-body-sm text-on-surface-variant">
            {doneCount} of {items.length} enrolled
          </p>
          <button
            type="button"
            onClick={runEnrollment}
            disabled={!canRun || isRunning}
            className="btn-primary min-h-[44px] px-lg rounded-lg text-body-sm font-semibold disabled:opacity-40"
          >
            {isRunning ? 'Encoding…' : 'Enroll batch'}
          </button>
        </div>
      )}
    </div>
  );
}
