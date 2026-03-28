"use client";

import { useState, useCallback, useEffect, createContext, useContext } from "react";
import { CheckCircle, AlertTriangle, XCircle, Info, X } from "lucide-react";

// ── Types ──

type ToastType = "success" | "error" | "warning" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
  action?: ToastAction;
  duration: number;
}

interface ToastOptions {
  detail?: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string, options?: number | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ── Provider ──

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string, options?: number | ToastOptions) => {
    const id = crypto.randomUUID();
    // Support legacy signature: toast(type, message, duration?)
    if (typeof options === "number" || options === undefined) {
      setToasts((prev) => [...prev, { id, type, message, duration: options ?? 3000 }]);
    } else {
      setToasts((prev) => [...prev, {
        id,
        type,
        message,
        detail: options.detail,
        action: options.action,
        duration: options.duration ?? 3000,
      }]);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-12 right-4 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Toast Item ──

const ACCENT_COLORS: Record<ToastType, string> = {
  success: "var(--accent-green)",
  error: "var(--accent-red)",
  warning: "var(--accent-yellow)",
  info: "var(--accent-blue)",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRemove(toast.id);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toast.id, onRemove]);

  const icons = {
    success: <CheckCircle size={14} className="text-[var(--accent-green)]" />,
    error: <XCircle size={14} className="text-[var(--accent-red)]" />,
    warning: <AlertTriangle size={14} className="text-[var(--accent-yellow)]" />,
    info: <Info size={14} className="text-[var(--accent-blue)]" />,
  };

  const accentColor = ACCENT_COLORS[toast.type];

  return (
    <div
      role="alert"
      className="pointer-events-auto relative overflow-hidden flex flex-col rounded-lg shadow-lg text-xs max-w-[300px] animate-slide-in border border-white/[0.08]"
      style={{ background: "rgba(var(--ds-colors-bgSecondary-rgb, 30, 30, 30), 0.85)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      {/* Content */}
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
        <div className="flex-1 min-w-0">
          <span>{toast.message}</span>
          {toast.detail && (
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-tight">{toast.detail}</p>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                onRemove(toast.id);
              }}
              className="mt-1 inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)]"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="text-[var(--text-secondary)] hover:text-white flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-blue)] rounded"
          aria-label="Dismiss notification"
        >
          <X size={10} />
        </button>
      </div>
      {/* Progress bar */}
      <div
        className="h-[2px] rounded-b-lg"
        style={{
          background: accentColor,
          opacity: 0.6,
          animation: `toast-progress ${toast.duration}ms linear forwards`,
        }}
      />
    </div>
  );
}
