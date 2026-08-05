"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, LogOut, UserRoundCheck } from "lucide-react";
import { ActionLink, Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import {
  attachEmailToCurrentUser,
  ensureAnonymousSession,
  getCurrentSession,
  getCurrentUser,
  signInWithEmailOtp,
  signOut,
} from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

type AuthSummary =
  | {
      kind: "none";
    }
  | {
      kind: "anon";
      userId: string;
    }
  | {
      kind: "email";
      userId: string;
      email: string;
    };

function summarizeSession(session: Awaited<ReturnType<typeof getCurrentSession>>): AuthSummary {
  if (!session?.user) return { kind: "none" };
  const userId = session.user.id;
  const email = session.user.email ?? "";

  if (email) {
    return { kind: "email", userId, email };
  }

  return { kind: "anon", userId };
}

export function AccountPanel() {
  const [status, setStatus] = useState<AuthSummary>({ kind: "none" });
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const label = useMemo(() => {
    if (status.kind === "email") return `Conectado: ${status.email}`;
    if (status.kind === "anon") return "Sesión anónima (puedes vincular email)";
    return "Sin sesión";
  }, [status]);

  const refresh = useCallback(async () => {
    const session = await getCurrentSession();
    setStatus(summarizeSession(session));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setBusy("boot");
      setError(null);
      setNotice(null);
      ensureAnonymousSession()
        .then(async () => {
          await refresh();
        })
        .catch((nextError) => {
          setError(safeErrorMessage(nextError));
        })
        .finally(() => setBusy(null));
    });
  }, [refresh]);

  const handleAttachEmail = useCallback(async () => {
    setBusy("attach");
    setError(null);
    setNotice(null);
    try {
      await attachEmailToCurrentUser(email);
      await refresh();
      setNotice("Email vinculado. Revisa tu correo para confirmar si Supabase lo requiere.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [email, refresh]);

  const handleSendOtp = useCallback(async () => {
    setBusy("otp");
    setError(null);
    setNotice(null);
    try {
      const redirectTo =
        typeof window === "undefined" ? undefined : `${window.location.origin}/account`;
      await signInWithEmailOtp(email, { redirectTo });
      setNotice("Te enviamos un link/código de acceso al correo.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [email]);

  const handleSignOut = useCallback(async () => {
    setBusy("signout");
    setError(null);
    setNotice(null);
    try {
      await signOut();
      setEmail("");
      await ensureAnonymousSession();
      await refresh();
      setNotice("Sesión cerrada. Se creó una sesión anónima para seguir usando CTimer.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [refresh]);

  const handleDebugUser = useCallback(async () => {
    setBusy("user");
    setError(null);
    setNotice(null);
    try {
      const user = await getCurrentUser();
      setNotice(user ? `UID: ${user.id}` : "No hay usuario.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <main className="app-shell light-grid min-h-screen px-5 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--color-primary)]">
              Cuenta
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase leading-[.95] tracking-normal md:text-7xl">
              Perfil
            </h1>
          </div>
          <ActionLink href="/" variant="secondary">
            <ArrowLeft size={16} aria-hidden />
            Volver al home
          </ActionLink>
        </div>

        <Panel>
          <SectionHeader
            eyebrow="Auth"
            title="Estado"
            description="CTimer funciona con sesión anónima para creación y acceso rápidos. Puedes vincular email para mantener tu cuenta."
            action={
              <Button disabled={busy === "user"} onClick={handleDebugUser} variant="secondary">
                <UserRoundCheck size={16} aria-hidden />
                Ver UID
              </Button>
            }
          />

          <div className="rounded-[22px] border border-black/10 bg-white/70 p-4 text-sm font-semibold text-black/62">
            {label}
          </div>

          <div className="mt-6 grid gap-4">
            <Field
              label="Email"
              hint="Si ya estás en sesión anónima, puedes vincular tu email al mismo UID (así My Timers no se pierde)."
            >
              <TextInput
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                value={email}
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button disabled={!email.trim() || Boolean(busy)} onClick={handleAttachEmail}>
                <KeyRound size={16} aria-hidden />
                Vincular email
              </Button>
              <Button
                disabled={!email.trim() || Boolean(busy)}
                onClick={handleSendOtp}
                variant="secondary"
              >
                Enviar link / OTP
              </Button>
              <Button disabled={Boolean(busy)} onClick={handleSignOut} variant="danger">
                <LogOut size={16} aria-hidden />
                Cerrar sesión
              </Button>
            </div>

            {notice ? (
              <div className="rounded-[20px] border border-[rgb(51_190_172_/_35%)] bg-[var(--color-accent-soft)] p-4 text-sm font-semibold text-[var(--color-foreground)]">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[20px] border border-[rgb(180_35_59_/_25%)] bg-[var(--color-danger-soft)] p-4 text-sm font-semibold text-[var(--color-danger)]">
                {error}
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </main>
  );
}
