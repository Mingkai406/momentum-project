"use client";
import { useEffect, useRef } from "react";
import { Icon } from "./Icons";
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) {
      dialog?.showModal();
      dialog?.querySelector<HTMLInputElement>("input, textarea")?.focus();
    } else if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={onClose}
      className="modal"
    >
      <div className="modal-head">
        <h2 id="modal-title">{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
