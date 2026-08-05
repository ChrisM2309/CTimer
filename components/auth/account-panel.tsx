"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, KeyRound, LogIn, LogOut, UserPlus, UserRoundCheck } from "lucide-react";
import { ActionLink, Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { Panel, SectionHeader } from "@/components/ui/panel";
import { useAuthState } from "@/components/auth/auth-provider";
import {
  attachEmailToCurrentUser,
  getCurrentUser,
  sendPasswordReset,
  signInWithEmailOtp,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
} from "@/lib/supabase";
import { safeErrorMessage } from "@/lib/utils";

export function AccountPanel() {
  const { refresh: refreshAuth, state: authState, user } = useAuthState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const label = useMemo(() => {
    if (authState === "loading") return "Restaurando sesión...";
    if (!user) return "Sin sesión";
    if (authState === "anonymous") return "Sesión anónima temporal";
    return `Conectado: ${user.email ?? "cuenta autenticada"}`;
  }, [authState, user]);

  useEffect(() => {
    queueMicrotask(() => setRecoveryMode(window.location.hash.includes("type=recovery")));
  }, []);

  const handlePasswordAuth = useCallback(async (kind: "login" | "signup") => {
    setBusy(kind);
    setError(null);
    setNotice(null);
    try {
      if (kind === "signup") {
        if (password !== passwordConfirmation) throw new Error("Las contraseñas no coinciden.");
        const data = await signUpWithPassword(email, password);
        if (data.session) {
          await refreshAuth();
          setNotice("Cuenta creada e iniciada correctamente.");
        } else {
          setNotice("Cuenta creada. Revisa tu correo para confirmar la cuenta antes de iniciar sesión.");
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
  }, [email, password, passwordConfirmation, refreshAuth]);

  const handleResetRequest = useCallback(async () => {
    setBusy("reset-request");
    setError(null);
    setNotice(null);
    try {
      await sendPasswordReset(email, `${window.location.origin}/account`);
      setNotice("Si el correo existe, recibirás instrucciones para restablecer la contraseña.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [email]);

  const handlePasswordUpdate = useCallback(async () => {
    setBusy("password-update");
    setError(null);
    setNotice(null);
    try {
      await updatePassword(password);
      setPassword("");
      setRecoveryMode(false);
      window.history.replaceState(null, "", "/account");
      setNotice("Contraseña actualizada.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [password]);

  const handleAttachEmail = useCallback(async () => {
    setBusy("attach");
    setError(null);
    setNotice(null);
    try {
      await attachEmailToCurrentUser(email);
      await refreshAuth();
      setNotice("Email vinculado. Revisa tu correo para confirmar si Supabase lo requiere.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, [email, refreshAuth]);

  const handleSendOtp = useCallback(async () => {
    setBusy("otp");
    setError(null);
    setNotice(null);
    try {
      await signInWithEmailOtp(email, { redirectTo: `${window.location.origin}/account` });
      setNotice("Te enviamos un link de acceso al correo.");
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
      setPassword("");
      setPasswordConfirmation("");
      setNotice("Sesión cerrada. Las listas, listeners y datos privados se limpiaron.");
    } catch (nextError) {
      setError(safeErrorMessage(nextError));
    } finally {
      setBusy(null);
    }
  }, []);

  const handleDebugUser = useCallback(async () => {
    setBusy("user");
    setError(null);
    setNotice(null);
    try {
      const currentUser = await getCurrentUser();
      setNotice(currentUser ? `UID: ${currentUser.id}` : "No hay usuario.");
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
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--color-primary)]">Cuenta</p>
            <h1 className="mt-3 text-5xl font-black uppercase leading-[.95] tracking-normal md:text-7xl">Perfil</h1>
          </div>
          <ActionLink href="/" variant="secondary"><ArrowLeft size={16} aria-hidden />Volver al home</ActionLink>
        </div>

        <Panel>
          <SectionHeader
            eyebrow="Auth"
            title="Estado"
            description="Los visitantes usan una sesión temporal aislada. Las cuentas permanentes pueden registrarse, iniciar sesión y recuperar su contraseña."
            action={<Button disabled={busy === "user"} onClick={handleDebugUser} variant="secondary"><UserRoundCheck size={16} aria-hidden />Ver UID</Button>}
          />

          <div className="rounded-[22px] border border-black/10 bg-white/70 p-4 text-sm font-semibold text-black/62">{label}</div>

          <div className="mt-6 grid gap-4">
            <Field label="Email">
              <TextInput autoComplete="email" inputMode="email" onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" value={email} />
            </Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres.">
              <TextInput autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </Field>
            {recoveryMode ? (
              <Button disabled={!password || Boolean(busy)} onClick={handlePasswordUpdate} variant="warm">Actualizar contraseña</Button>
            ) : (
              <Field label="Repetir contraseña" hint="Solo se usa al registrar una cuenta.">
                <TextInput autoComplete="new-password" onChange={(event) => setPasswordConfirmation(event.target.value)} type="password" value={passwordConfirmation} />
              </Field>
            )}

            <div className="flex flex-wrap gap-2">
              <Button disabled={!email.trim() || Boolean(busy)} onClick={() => void handlePasswordAuth("signup")}><UserPlus size={16} aria-hidden />Registrar cuenta</Button>
              <Button disabled={!email.trim() || !password || Boolean(busy)} onClick={() => void handlePasswordAuth("login")} variant="secondary"><LogIn size={16} aria-hidden />Iniciar sesión</Button>
              <Button disabled={!email.trim() || Boolean(busy)} onClick={() => void handleResetRequest()} variant="ghost">Recuperar contraseña</Button>
              <Button disabled={!email.trim() || Boolean(busy)} onClick={handleAttachEmail} variant="secondary"><KeyRound size={16} aria-hidden />Vincular email</Button>
              <Button disabled={!email.trim() || Boolean(busy)} onClick={handleSendOtp} variant="secondary">Enviar link / OTP</Button>
              <Button disabled={Boolean(busy)} onClick={handleSignOut} variant="danger"><LogOut size={16} aria-hidden />Cerrar sesión</Button>
            </div>

            {notice ? <div className="rounded-[20px] border border-[rgb(51_190_172_/_35%)] bg-[var(--color-accent-soft)] p-4 text-sm font-semibold text-[var(--color-foreground)]">{notice}</div> : null}
            {error ? <div className="rounded-[20px] border border-[rgb(180_35_59_/_25%)] bg-[var(--color-danger-soft)] p-4 text-sm font-semibold text-[var(--color-danger)]">{error}</div> : null}
          </div>
        </Panel>
      </div>
    </main>
  );
}
