"use client";

import { useEffect, useRef } from "react";

export type ConfirmDialogConfig = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  // "danger" renders the confirm button in red — use for ban/delete/etc.
  variant?: "danger" | "default";
  onConfirm: () => void;
};

type Props = {
  // null means "closed". A non-null value opens the dialog with that config.
  config: ConfirmDialogConfig | null;
  onClose: () => void;
};

/**
 * Lightweight confirm modal used for destructive admin actions.
 *
 * Behaviour:
 *  - Esc closes the dialog (treated as cancel)
 *  - Click on the backdrop closes the dialog (cancel)
 *  - Cancel button is autofocused on open so a stray Enter does NOT confirm a
 *    destructive action by accident.
 */
export function ConfirmDialog({ config, onClose }: Props) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const open = config !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    // Focus the cancel button so an accidental Enter doesn't trigger the
    // destructive action.
    cancelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !config) {
    return null;
  }

  const confirmClasses = config.variant === "danger"
    ? "bg-rose-600 text-white hover:bg-rose-700"
    : "bg-slate-950 text-white hover:bg-teal-800";

  const handleConfirm = () => {
    // Run the caller's handler first so any state updates land before we close,
    // then close the dialog.
    config.onConfirm();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-xl font-black text-slate-950">
          {config.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{config.message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="pressable rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            {config.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`pressable rounded-lg px-4 py-2 text-sm font-bold ${confirmClasses}`}
          >
            {config.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
