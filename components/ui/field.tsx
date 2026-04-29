import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-[var(--color-graphite)] shadow-sm outline-none transition placeholder:text-black/35 focus:border-[var(--color-red)] focus:ring-2 focus:ring-[rgba(197,23,46,.18)] disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  children,
  className,
  hint,
  label,
  tone = "light",
}: {
  children: ReactNode;
  className?: string;
  hint?: string;
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span
        className={cn(
          "text-[11px] font-black uppercase tracking-[.18em]",
          tone === "dark" ? "text-[var(--color-warm)]" : "text-[var(--color-muted)]",
        )}
      >
        {label}
      </span>
      {children}
      {hint ? (
        <span
          className={cn(
            "text-xs leading-5",
            tone === "dark" ? "text-white/58" : "text-black/58",
          )}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(controlClasses, "min-h-28 resize-y leading-6", className)}
      {...props}
    />
  );
}

export function SelectField({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, className)} {...props} />;
}
