// client/src/components/Dropzone.jsx
import React from "react";

export default function Dropzone({ files = [], setFiles }) {
  const addFiles = (list) => {
    const pdfs = Array.from(list).filter((f) => f.type === "application/pdf");
    if (pdfs.length) setFiles([...(files || []), ...pdfs]);
  };

  const onInputChange = (e) => addFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 p-6 text-center"
    >
      {/* Khmer-only instruction text */}
      <p className="text-slate-600 select-none">
        បញ្ចូលឯកសារ PDF នៅទីនេះ
      </p>

      {/* Invisible input that makes the whole box clickable */}
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={onInputChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
        title=""                 // no default tooltip
        aria-label="ជ្រើសឯកសារ PDF"
      />

      {/* Show selected file names (optional) */}
      {files?.length > 0 && (
        <div className="mt-3 text-left max-h-32 overflow-auto text-sm text-slate-700">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="truncate">• {f.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}
