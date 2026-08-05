import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold text-[var(--color-foreground)] shadow-sm outline-none transition placeholder:text-[var(--color-foreground-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgb(51_190_172_/_22%)] disabled:cursor-not-allowed disabled:opacity-60";

export function Field({ children, className, hint, label, tone = "light" }: {
  children: ReactNode;
  className?: string;
  hint?: string;
  label: string;
  tone?: "light" | "dark";
}) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className={cn("text-[11px] font-bold uppercase tracking-[.16em]", tone === "dark" ? "text-[var(--color-accent)]" : "text-[var(--color-foreground-muted)]")}>
        {label}
      </span>
      {children}
      {hint ? <span className={cn("text-xs leading-5", tone === "dark" ? "text-white/58" : "text-[var(--color-foreground-muted)]")}>{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlClasses, "min-h-28 resize-y leading-6", className)} {...props} />;
}

export function SelectField({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClasses, className)} {...props} />;
}
