"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface PickedFile {
  name: string;
  size: number;
  data: string;
  mimeType: string;
}

/**
 * A file picker somebody will actually use.
 *
 * The default file input is a small grey button that gives no feedback and no
 * drag target. This one takes a drop, names the file, shows its size, and lets
 * it be removed again.
 */
export function Dropzone({
  file,
  onFile,
  accept = "application/pdf,image/png,image/jpeg,image/webp",
  maxBytes = 6_000_000,
  hint = "PDF, PNG or JPEG, up to 6 MB",
  label = "Drop a file here, or browse",
}: {
  file: PickedFile | null;
  onFile: (file: PickedFile | null) => void;
  accept?: string;
  maxBytes?: number;
  hint?: string;
  label?: string;
}) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function take(picked: File | undefined | null) {
    if (!picked) return;
    setError(null);
    if (picked.size > maxBytes) {
      setError(`That file is ${(picked.size / 1_000_000).toFixed(1)} MB. The limit is ${maxBytes / 1_000_000} MB.`);
      return;
    }
    setReading(true);
    try {
      const buf = await picked.arrayBuffer();
      let binary = "";
      for (const b of new Uint8Array(buf)) binary += String.fromCharCode(b);
      onFile({
        name: picked.name,
        size: picked.size,
        data: btoa(binary),
        mimeType: picked.type || "application/pdf",
      });
    } catch {
      setError("We could not read that file. Try another one.");
    } finally {
      setReading(false);
    }
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-[--radius-control] border border-proof/40 bg-proof/5 px-4 py-3">
        <FileText size={18} className="shrink-0 text-proof" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium">{file.name}</p>
          <p className="text-[11.5px] text-dim">
            {(file.size / 1024).toFixed(0)} KB · ready
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          aria-label={`Remove ${file.name}`}
          className="rounded-lg p-1.5 text-dim transition-colors hover:bg-raise hover:text-alert"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-[--radius-control] border-2 border-dashed px-4 py-7 transition-colors",
          over
            ? "border-signal bg-wash"
            : "border-edge bg-deep hover:border-signal-deep hover:bg-raise",
        )}
      >
        <Upload
          size={20}
          className={cn("transition-colors", over ? "text-signal" : "text-dim")}
          aria-hidden="true"
        />
        <span className="text-[13.5px] font-medium">
          {reading ? "Reading…" : label}
        </span>
        <span className="text-[11.5px] text-dim">{hint}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => void take(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-[12.5px] text-alert">{error}</p>}
    </div>
  );
}
