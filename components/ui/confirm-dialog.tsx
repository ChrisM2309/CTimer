"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  confirmLabel = "Confirmar",
  description,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  if (!open) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-[var(--radius-xl)] border border-white/12 bg-[var(--color-graphite)] p-6 text-[var(--color-light)] shadow-[var(--shadow-strong)]">
        <div className="mb-5 flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full border border-[rgba(197,23,46,.35)] bg-[rgba(197,23,46,.14)] text-[var(--color-red)]">
            <AlertTriangle size={22} aria-hidden />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-[-.03em]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/68">{description}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
