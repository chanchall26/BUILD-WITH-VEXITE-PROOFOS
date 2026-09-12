"use client";

import { Check, TriangleAlert, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * Small confirmations for actions that would otherwise happen silently.
 *
 * Copying a passport, saving a decision, finishing a check. Without a toast
 * these feel like nothing happened and people click twice.
 */

type Tone = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<{
  show: (message: string, tone?: Tone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const show = useCallback((message: string, tone: Tone = "success") => {
    const id = next.current++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2 px-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pop-in pointer-events-auto flex items-center gap-2.5 rounded-full border border-edge bg-slab px-4 py-2.5 text-[13.5px] font-medium shadow-[var(--shadow-pop)]"
          >
            <span
              className={
                t.tone === "success"
                  ? "text-proof"
                  : t.tone === "error"
                    ? "text-alert"
                    : "text-signal"
              }
            >
              {t.tone === "error" ? <TriangleAlert size={15} /> : <Check size={15} />}
            </span>
            {t.message}
            <button
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              className="ml-1 text-dim transition-colors hover:text-bright"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Falls back to a no-op so a component can be used outside the provider. */
export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {} };
}
