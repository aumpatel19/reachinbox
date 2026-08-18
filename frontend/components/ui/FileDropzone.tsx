"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

export interface FileDropzoneProps {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
}

export function FileDropzone({ onFile, accept = ".csv,.txt", label = "Upload List" }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 ${
          isDragging ? "underline" : ""
        }`}
      >
        <UploadCloud className="h-4 w-4" />
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
