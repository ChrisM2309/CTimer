"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ confirmLabel = "Confirmar", description, onCancel, onConfirm, open, title }: {
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;

  return (
    <div aria-modal="true" className="fixed inset-0 z-[var(--z-dialog)] grid place-items-center bg-[var(--color-overlay)] p-5 backdrop-blur-sm" role="dialog">
      <div className="w-full max-w-lg rounded-[var(--radius-xl)] border border-white/12 bg-[var(--color-surface-dark)] p-6 text-[var(--color-foreground-on-dark)] shadow-[var(--shadow-strong)]">
        <div className="mb-5 flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full border border-[rgb(180_35_59_/_35%)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]"><AlertTriangle size={22} aria-hidden /></div>
          <div><h2 className="brand-display text-2xl font-extrabold tracking-[-.03em]">{title}</h2><p className="mt-2 text-sm leading-6 text-white/68">{description}</p></div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
