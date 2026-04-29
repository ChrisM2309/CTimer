export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const maybeError = error as {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      message?: unknown;
    };

    if (typeof maybeError.message === "string") {
      const parts = [maybeError.message];

      if (typeof maybeError.code === "string") {
        parts.push(`Código: ${maybeError.code}`);
      }

      if (typeof maybeError.hint === "string" && maybeError.hint.length > 0) {
        parts.push(`Hint: ${maybeError.hint}`);
      }

      if (
        typeof maybeError.details === "string" &&
        maybeError.details.length > 0
      ) {
        parts.push(`Detalle: ${maybeError.details}`);
      }

      return parts.join(" · ");
    }
  }

  return "Ocurrió un error inesperado.";
}
