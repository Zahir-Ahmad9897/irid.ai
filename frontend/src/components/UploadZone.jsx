import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, X } from 'lucide-react';

/**
 * Drag-and-drop / click-to-browse image upload zone.
 *
 * @param {Object} props
 * @param {File|null} props.file - Currently selected file.
 * @param {string|null} props.previewUrl - Object URL for the preview image.
 * @param {(file: File) => void} props.onFileSelect - Called when a valid image file is chosen.
 * @param {() => void} props.onClear - Called when the user removes the selected image.
 * @param {React.ReactNode} [props.overlay] - Optional overlay rendered on top of the preview image (e.g. bounding boxes).
 * @param {(dims: {w:number,h:number}) => void} [props.onImageLoad] - Called with natural image dimensions once loaded.
 * @param {React.Ref} [props.imgRef] - Ref forwarded to the <img> element.
 */
export default function UploadZone({
  file,
  previewUrl,
  onFileSelect,
  onClear,
  overlay = null,
  onImageLoad,
  imgRef,
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef(null);

  const acceptFile = useCallback(
    (selected) => {
      if (!selected) return;
      if (!/^image\/(jpeg|jpg|png)$/.test(selected.type)) return;
      onFileSelect(selected);
    },
    [onFileSelect]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    acceptFile(dropped);
  };

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    acceptFile(selected);
    // Reset so selecting the same file again still fires onChange
    e.target.value = '';
  };

  if (previewUrl) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-border-subtle bg-surface-base flex justify-center items-center group">
        <img
          ref={imgRef}
          src={previewUrl}
          alt="Uploaded preview"
          className="object-contain max-h-[420px] w-auto"
          onLoad={(e) =>
            onImageLoad?.({ w: e.target.naturalWidth, h: e.target.naturalHeight })
          }
        />
        {overlay}
        <button
          type="button"
          onClick={onClear}
          className="absolute top-md right-md p-2 bg-surface-elevated/90 backdrop-blur border border-border-subtle shadow-level-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-hover transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Remove image"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
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
      className={`flex flex-col items-center justify-center w-full min-h-[260px] border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ease-in-out
        ${isDragActive
          ? 'border-accent-cyan bg-primary-soft'
          : 'border-border-subtle-light bg-surface-base hover:bg-surface-hover hover:border-border-subtle-hover'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="p-4 rounded-full bg-surface-elevated border border-border-subtle mb-md">
        <UploadCloud className="w-8 h-8 text-on-surface-variant" strokeWidth={1.5} />
      </div>
      <p className="text-on-surface font-medium text-center text-body-md">
        Drag &amp; drop an image here, or click to browse
      </p>
      <p className="text-on-surface-muted text-body-sm mt-xs text-center max-w-xs">
        Supports JPG, JPEG, and PNG formats.
      </p>
    </div>
  );
}
