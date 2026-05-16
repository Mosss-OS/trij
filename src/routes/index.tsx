import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, WifiOff, KeyRound } from "lucide-react";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { toast } from "sonner";
import { hasPinForUser, verifyPin, recordFailedAttempt, setupPin } from "@/lib/pin-auth";
import { getDB } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

const LS_LAST_USER = "trij_last_user_id";

function getLastUserId(): string | null {
  return localStorage.getItem(LS_LAST_USER);
}

function setLastUserId(id: string) {
  localStorage.setItem(LS_LAST_USER, id);
}

function clearLastUserId() {
  localStorage.removeItem(LS_LAST_USER);
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trij — Sign in" },
      {
        name: "description",
        content:
          "Trij: offline-first AI triage for community health workers, powered by on-device Gemma.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  useAuthSession();
  const session = useSessionStore((s) => s.session);
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const loading = useSessionStore((s) => s.loading);
  const setOfflineSession = useSessionStore((s) => s.setOfflineSession);
  const online = useOnlineStatus();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const [pinMode, setPinMode] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [remainingAttempts, setRemainingAttempts] = useState(5);
  const [locked, setLocked] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pendingPinUser, setPendingPinUser] = useState<string | null>(null);
  const [setupPinValue, setSetupPinValue] = useState("");
  const [setupPinConfirm, setSetupPinConfirm] = useState("");
  const [setupPinError, setSetupPinError] = useState("");

  useEffect(() => {
    if (loading) return;
    if (session || offlineUser) return;
    if (online) {
      setPinMode(false);
      setCheckingPin(false);
      return;
    }
    setCheckingPin(true);
    (async () => {
      try {
        const lastId = getLastUserId();
        let records: import("@/lib/pin-auth").PinRecord[];
        if (lastId) {
          const r = await getDB().pinAuth.get(lastId);
          records = r ? [r] : [];
        } else {
          records = await getDB().pinAuth.toArray();
        }
        if (records.length > 0) {
          const rec = records[0];
          setEmail(rec.email);
          setPinMode(true);
          setLocked(rec.locked);
          setRemainingAttempts(Math.max(0, 5 - rec.failedAttempts));
        } else {
          setPinMode(false);
        }
      } catch {
        setPinMode(false);
      } finally {
        setCheckingPin(false);
      }
    })();
  }, [loading, online, session, offlineUser]);

  if (loading || checkingPin) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (session || offlineUser) return <Navigate to="/dashboard" />;

  const handleOnlineSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name },
          },
        });
        if (error) throw error;
        if (data.session?.user) {
          toast.success(t("accountCreated"));
          setLastUserId(data.session.user.id);
          const hasPin = await hasPinForUser(data.session.user.id);
          if (!hasPin) {
            setPendingPinUser(data.session.user.id);
            setShowPinSetup(true);
          }
        } else {
          toast.info(t("checkEmailConfirm"));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session?.user) {
          const { user } = data.session;
          setLastUserId(user.id);
          const hasPin = await hasPinForUser(user.id);
          if (!hasPin) {
            setPendingPinUser(user.id);
            setShowPinSetup(true);
          }
        }
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handlePinSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setPinError("");
    try {
      const lastId = getLastUserId();
      let resolved: import("@/lib/pin-auth").PinRecord[];
      if (lastId) {
        const r = await getDB().pinAuth.get(lastId);
        resolved = r ? [r] : [];
      } else {
        resolved = await getDB().pinAuth.toArray();
      }
      if (resolved.length === 0) {
        setPinError(t("noPinConfigured"));
        return;
      }
      const record = resolved[0];
      if (record.locked) {
        setLocked(true);
        setPinError(t("accountLocked"));
        return;
      }
      const ok = await verifyPin(record.userId, pin);
      if (!ok) {
        const result = await recordFailedAttempt(record.userId);
        const remaining = Math.max(0, 5 - result.attempts);
        setRemainingAttempts(result.locked ? 0 : remaining);
        if (result.locked) {
          setLocked(true);
          setPinError(t("accountLocked"));
        } else {
          setPinError(t("incorrectPinAttempts").replace("{remaining}", String(remaining)));
        }
        return;
      }
      setOfflineSession({ id: record.userId, email: record.email });
    } catch (err) {
      setPinError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSetupPin = async () => {
    setSetupPinError("");
    if (setupPinValue.length < 4 || setupPinValue.length > 6) {
      setSetupPinError(t("pinDigits"));
      return;
    }
    if (!/^\d+$/.test(setupPinValue)) {
      setSetupPinError(t("pinDigitsOnly"));
      return;
    }
    if (setupPinValue !== setupPinConfirm) {
      setSetupPinError(t("pinMismatch"));
      return;
    }
    setBusy(true);
    try {
      const s = useSessionStore.getState().session;
      const uid = pendingPinUser || s?.user?.id;
      if (!uid) throw new Error(t("noActiveSession"));
      const userEmail = s?.user?.email ?? email;
      await setupPin(uid, userEmail, setupPinValue);
      const newRec = await getDB().pinAuth.get(uid);
      if (!newRec) throw new Error("Failed to save PIN");
      toast.success(t("pinConfiguredSuccessfully"));
      setShowPinSetup(false);
      setPendingPinUser(null);
      setSetupPinValue("");
      setSetupPinConfirm("");
    } catch (err) {
      setSetupPinError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (pinMode && !online) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <div className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                <span className="font-display text-xl font-bold">T</span>
              </div>
              <span className="font-display text-xl font-bold">Trij</span>
            </div>
            <OfflineIndicator />
          </div>

          <div className="mt-12">
            <div className="flex items-center gap-3">
              <KeyRound className="h-8 w-8 text-primary" />
              <h1 className="font-display text-2xl font-bold leading-tight tracking-tight">
                {t("offlineSignIn")}
              </h1>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t("noInternetPin")}
            </p>
          </div>

          <form
            onSubmit={handlePinSubmit}
            className="mt-10 space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
          >
            <div className="space-y-1.5">
              <Label htmlFor="pin">{t("offlinePin")}</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setPin(v);
                  setPinError("");
                }}
                placeholder={t("enterPin")}
                disabled={locked}
                required
                autoFocus
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              {!locked && (
                <p className="text-xs text-muted-foreground">
                  {t("incorrectPinAttempts").replace("{remaining}", String(remainingAttempts))}
                </p>
              )}
            </div>
            <Button type="submit" disabled={busy || locked} className="w-full" size="lg">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("unlock")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <WifiOff className="mr-1 inline h-3.5 w-3.5" />
              {t("offlineModeDataSync")}
            </p>
          </form>

          <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
            {t("patientDataNeverLeaves")}
          </p>
        </div>

        <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("setUpOfflinePinTitle")}</DialogTitle>
              <DialogDescription>{t("pinDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setup-pin">{t("newPin")}</Label>
                <Input
                  id="setup-pin"
                  type="password"
                  inputMode="numeric"
                  value={setupPinValue}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setSetupPinValue(v);
                    setSetupPinError("");
                  }}
                  placeholder={t("pinDigits")}
                  className="text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup-pin-confirm">{t("confirmPin")}</Label>
                <Input
                  id="setup-pin-confirm"
                  type="password"
                  inputMode="numeric"
                  value={setupPinConfirm}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setSetupPinConfirm(v);
                    setSetupPinError("");
                  }}
                  placeholder={t("reEnterPin")}
                  className="text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
              {setupPinError && <p className="text-xs text-destructive">{setupPinError}</p>}
              <div className="flex gap-2">
                <Button onClick={handleSetupPin} disabled={busy} className="flex-1" size="lg">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("savePin")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPinSetup(false);
                    setPendingPinUser(null);
                    setSetupPinValue("");
                    setSetupPinConfirm("");
                    setSetupPinError("");
                  }}
                  disabled={busy}
                  className="flex-1"
                  size="lg"
                >
                  {t("skip")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <span className="font-display text-xl font-bold">T</span>
            </div>
            <span className="font-display text-xl font-bold">Trij</span>
          </Link>
          <OfflineIndicator />
        </div>

        <div className="mt-12">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            {t("fieldReadyTriage")}
            <br />
            <span className="text-primary">{t("onEveryDevice")}</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("gemmaOnDevice")}</p>
        </div>

        <form
          onSubmit={handleOnlineSubmit}
          className="mt-10 space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
        >
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("yourName")}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="A. Patel"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full" size="lg">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signup" ? t("createAccount") : t("signIn")}
          </Button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? t("firstTimeRegister") : t("haveAccountSignIn")}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t("or")}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOfflineSession({ id: crypto.randomUUID(), email: "demo@trij.app" })}
            className="w-full"
            size="lg"
          >
            {t("continueWithoutAccount")}
          </Button>
        </form>

        <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          {t("patientDataNeverLeaves")}
        </p>
      </div>

      <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("setUpOfflinePinTitle")}</DialogTitle>
            <DialogDescription>{t("pinDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="setup-pin-online">{t("newPin")}</Label>
              <Input
                id="setup-pin-online"
                type="password"
                inputMode="numeric"
                value={setupPinValue}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setSetupPinValue(v);
                  setSetupPinError("");
                }}
                placeholder={t("pinDigits")}
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-pin-confirm-online">{t("confirmPin")}</Label>
              <Input
                id="setup-pin-confirm-online"
                type="password"
                inputMode="numeric"
                value={setupPinConfirm}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setSetupPinConfirm(v);
                  setSetupPinError("");
                }}
                placeholder={t("reEnterPin")}
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            {setupPinError && <p className="text-xs text-destructive">{setupPinError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSetupPin} disabled={busy} className="flex-1" size="lg">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("savePin")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPinSetup(false);
                  setPendingPinUser(null);
                  setSetupPinValue("");
                  setSetupPinConfirm("");
                  setSetupPinError("");
                }}
                disabled={busy}
                className="flex-1"
                size="lg"
              >
                {t("skip")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
