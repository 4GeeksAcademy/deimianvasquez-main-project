"use client";

import { useState, useRef, type DragEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onFileUpload, loading }: FileUploadProps) {
  const t = useTranslations("incidents");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith(".csv")) {
        setFileName(file.name);
        onFileUpload(file);
      }
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      onFileUpload(file);
    }
  };

  return (
    <div className="bg-surface rounded-xl border-2 border-dashed border-border p-8 text-center">
      <div
        className={`cursor-pointer transition-colors ${
          dragOver ? "bg-primary-100 rounded-lg" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={loading ? undefined : handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />

        {loading ? (
          <div className="py-4">
            <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-700 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-primary font-medium">
              {t("analyzing")}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {t("processing", { fileName: fileName || "incidencias" })}
            </p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-text-primary font-medium">
              {fileName
                ? t("dropzone_selected", { fileName })
                : t("dropzone_text")}
            </p>
            <p className="text-sm text-text-secondary mt-2">
              {t("dropzone_hint")}
            </p>
            {fileName && (
              <p className="text-xs text-text-secondary mt-2">
                {t("dropzone_change")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}