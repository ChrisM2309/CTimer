"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, LogIn, LogOut, UserPlus } from "lucide-react";
import { useAuthState } from "@/components/auth/auth-provider";
import { ActionLink, Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { signInWithPassword, signOut, signUpWithPassword } from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

type AuthMode = "login" | "register";

export function AccountPanel() {
  const { refresh: refreshAuth, state: authState, user } = useAuthState();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isRegistering = mode === "register";
  const statusLabel = useMemo(() => {
    if (authState === "loading") return "Restaurando sesión...";
    if (authState === "anonymous") return "Visitante · sesión temporal";
    if (user) return `Sesión activa · ${user.email ?? "cuenta"}`;
    return "Sin sesión";
  }, [authState, user]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
    setPassword("");
    setPasswordConfirmation("");
  }

  const handleSubmit = useCallback(async () => {
    setBusy(mode);
    setError(null);
    setNotice(null);

    try {
      if (isRegistering) {
        if (password !== passwordConfirmation) {
          throw new Error("Las contraseñas no coinciden.");
        }

        const data = await signUpWithPassword(email, password);
        if (data.session) {
          await refreshAuth();
          setNotice("Cuenta creada. Ya puedes empezar a usar CTimer.");
        } else {
          setNotice("La cuenta se creó, pero Supabase todavía exige confirmar el correo. Desactiva Confirm email y guarda los cambios en Auth.");
        }
      } else {
        await signInWithPassword(email, password);
        await refreshAuth();
        setNotice("Sesión iniciada correctamente.");
      }

      setPassword("");
      setPasswordConfirmation("");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [email, isRegistering, mode, password, passwordConfirmation, refreshAuth]);

  const handleSignOut = useCallback(async () => {
    setBusy("signout");
    setError(null);
    setNotice(null);
    try {
      await signOut();
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      setNotice("Sesión cerrada correctamente.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, []);

  return (
    <main className="app-shell light-grid min-h-screen px-5 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--color-primary)]">Cuenta</p>
            <h1 className="mt-3 text-5xl font-black uppercase leading-[.9] tracking-[-.05em] md:text-7xl">Tu perfil</h1>
          </div>
          <ActionLink href="/" variant="secondary"><ArrowLeft size={16} aria-hidden />Volver al home</ActionLink>
        </div>

        <Panel className="overflow-hidden p-0">
          <div className="grid gap-8 p-6 sm:p-8 md:p-10">
            <div className="max-w-xl">
              <p className="text-[11px] font-black uppercase tracking-[.2em] text-[var(--color-primary)]">Acceso CTimer</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.04em] text-[var(--color-foreground)] sm:text-4xl">
                {isRegistering ? "Crea tu cuenta" : "Bienvenido de vuelta"}
              </h2>
              <p className="mt-3 text-sm font-medium leading-6 text-[var(--color-foreground-muted)]">
                {isRegistering
                  ? "Regístrate con email y contraseña para guardar tus timers en tu cuenta."
                  : "Inicia sesión para recuperar tus timers y continuar donde lo dejaste."}
              </p>
            </div>

            <div className="grid gap-1 rounded-[20px] border border-black/10 bg-black/[.04] p-1 sm:grid-cols-2" role="tablist" aria-label="Tipo de acceso">
              <button
                aria-selected={!isRegistering}
                className={`rounded-[16px] px-4 py-3 text-sm font-black transition ${!isRegistering ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-foreground-muted)] hover:bg-white"}`}
                onClick={() => changeMode("login")}
                role="tab"
                type="button"
              >
                <span className="inline-flex items-center gap-2"><LogIn size={16} aria-hidden />Iniciar sesión</span>
              </button>
              <button
                aria-selected={isRegistering}
                className={`rounded-[16px] px-4 py-3 text-sm font-black transition ${isRegistering ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-foreground-muted)] hover:bg-white"}`}
                onClick={() => changeMode("register")}
                role="tab"
                type="button"
              >
                <span className="inline-flex items-center gap-2"><UserPlus size={16} aria-hidden />Crear cuenta</span>
              </button>
            </div>

            <div className="rounded-[18px] border border-black/10 bg-white/70 px-4 py-3 text-sm font-bold text-[var(--color-foreground-muted)]">
              {statusLabel}
            </div>

            <div className="grid gap-5">
              <Field label="Email">
                <TextInput autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" type="email" value={email} />
              </Field>
              <Field label="Contraseña" hint="Mínimo 8 caracteres.">
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]" size={17} aria-hidden />
                  <TextInput autoComplete={isRegistering ? "new-password" : "current-password"} className="pl-11" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
                </div>
              </Field>
              {isRegistering ? (
                <Field label="Confirmar contraseña">
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-foreground-muted)]" size={17} aria-hidden />
                    <TextInput autoComplete="new-password" className="pl-11" onChange={(event) => setPasswordConfirmation(event.target.value)} type="password" value={passwordConfirmation} />
                  </div>
                </Field>
              ) : null}

              <Button className="mt-1 min-h-12 w-full" disabled={!email.trim() || !password || Boolean(busy)} onClick={() => void handleSubmit()}>
                {isRegistering ? <UserPlus size={17} aria-hidden /> : <LogIn size={17} aria-hidden />}
                {busy === mode ? "Procesando..." : isRegistering ? "Crear cuenta" : "Iniciar sesión"}
              </Button>
            </div>

            {notice ? <div className="rounded-[18px] border border-[rgb(51_190_172_/_35%)] bg-[var(--color-accent-soft)] p-4 text-sm font-semibold text-[var(--color-foreground)]">{notice}</div> : null}
            {error ? <div className="rounded-[18px] border border-[rgb(180_35_59_/_25%)] bg-[var(--color-danger-soft)] p-4 text-sm font-semibold text-[var(--color-danger)]">{error}</div> : null}

            {user ? (
              <div className="border-t border-black/10 pt-5">
                <Button disabled={Boolean(busy)} onClick={handleSignOut} variant="danger"><LogOut size={16} aria-hidden />Cerrar sesión</Button>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </main>
  );
}
