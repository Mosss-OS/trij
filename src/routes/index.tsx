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
import {
  hasPinForUser,
  verifyPin,
  recordFailedAttempt,
  getPinInfo,
  setupPin,
} from "@/lib/pin-auth";
import { getDB } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  useAuthSession();
  const session = useSessionStore((s) => s.session);
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const loading = useSessionStore((s) => s.loading);
  const setOfflineSession = useSessionStore((s) => s.setOfflineSession);
  const clearAuth = useSessionStore((s) => s.clearAuth);
  const setSession = useSessionStore((s) => s.setSession);
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
    getDB()
      .pinAuth.toArray()
      .then((records) => {
        if (records.length > 0) {
          const latest = records[records.length - 1];
          setEmail(latest.email);
          setPinMode(true);
          setLocked(latest.locked);
          setRemainingAttempts(Math.max(0, 5 - latest.failedAttempts));
        } else {
          setPinMode(false);
        }
      })
      .catch(() => {
        setPinMode(false);
      })
      .finally(() => setCheckingPin(false));
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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.session?.user) {
          const { user } = data.session;
          const hasPin = await hasPinForUser(user.id);
          if (!hasPin) {
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
      const records = await getDB().pinAuth.toArray();
      if (records.length === 0) {
        setPinError("No offline PIN configured. Connect to the internet to sign in.");
        return;
      }
      const record = records[records.length - 1];
      if (record.locked) {
        setLocked(true);
        setPinError(
          "Account locked due to too many failed attempts. Connect to the internet to reset.",
        );
        return;
      }
      const ok = await verifyPin(record.userId, pin);
      if (!ok) {
        const nowLocked = await recordFailedAttempt(record.userId);
        const remaining = Math.max(0, 4 - record.failedAttempts);
        setRemainingAttempts(nowLocked ? 0 : remaining);
        if (nowLocked) {
          setLocked(true);
          setPinError(
            "Account locked due to too many failed attempts. Connect to the internet to reset.",
          );
        } else {
          setPinError(`Incorrect PIN. ${remaining} attempt(s) remaining.`);
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
      setSetupPinError("PIN must be 4-6 digits");
      return;
    }
    if (!/^\d+$/.test(setupPinValue)) {
      setSetupPinError("PIN must contain only digits");
      return;
    }
    if (setupPinValue !== setupPinConfirm) {
      setSetupPinError("PINs do not match");
      return;
    }
    setBusy(true);
    try {
      const s = useSessionStore.getState().session;
      if (!s?.user) throw new Error("No active session");
      await setupPin(s.user.id, s.user.email ?? email, setupPinValue);
      toast.success("Offline PIN configured successfully");
      setShowPinSetup(false);
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
                Offline sign in
              </h1>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              No internet connection. Enter your offline PIN to continue using Trij.
            </p>
          </div>

          <form
            onSubmit={handlePinSubmit}
            className="mt-10 space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
          >
            <div className="space-y-1.5">
              <Label htmlFor="pin">Offline PIN</Label>
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
                placeholder="Enter your 4-6 digit PIN"
                disabled={locked}
                required
                autoFocus
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
              {pinError && <p className="text-xs text-destructive">{pinError}</p>}
              {!locked && (
                <p className="text-xs text-muted-foreground">
                  {remainingAttempts} attempt(s) remaining
                </p>
              )}
            </div>
            <Button type="submit" disabled={busy || locked} className="w-full" size="lg">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unlock
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              <WifiOff className="mr-1 inline h-3.5 w-3.5" />
              Offline mode — data will sync when connected
            </p>
          </form>

          <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
            <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
            Inference runs on-device via WebGPU. Records sync only when online.
          </p>
        </div>

        <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set up offline PIN</DialogTitle>
              <DialogDescription>
                Choose a 4-6 digit PIN to sign in when you don't have internet access.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="setup-pin">New PIN</Label>
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
                  placeholder="4-6 digits"
                  className="text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setup-pin-confirm">Confirm PIN</Label>
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
                  placeholder="Re-enter PIN"
                  className="text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                />
              </div>
              {setupPinError && <p className="text-xs text-destructive">{setupPinError}</p>}
              <Button onClick={handleSetupPin} disabled={busy} className="w-full" size="lg">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save PIN
              </Button>
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
            Field-ready triage,
            <br />
            <span className="text-primary">on every device.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Gemma runs entirely on your device. Patient data never leaves the phone for AI
            inference.
          </p>
        </div>

        <form
          onSubmit={handleOnlineSubmit}
          className="mt-10 space-y-4 rounded-3xl border bg-card p-6 shadow-sm"
        >
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
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
            <Label htmlFor="email">Email</Label>
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
            <Label htmlFor="password">Password</Label>
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
            {mode === "signup" ? "Create account" : "Sign in"}
          </Button>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "First time? Register a CHW account" : "Have an account? Sign in"}
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOfflineSession({ id: crypto.randomUUID(), email: "demo@trij.app" })}
            className="w-full"
            size="lg"
          >
            Continue without account
          </Button>
        </form>

        <p className="mt-auto pt-10 text-center text-xs text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
          Inference runs on-device via WebGPU. Records sync only when online.
        </p>
      </div>

      <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up offline PIN</DialogTitle>
            <DialogDescription>
              Choose a 4-6 digit PIN to sign in when you don't have internet access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="setup-pin-online">New PIN</Label>
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
                placeholder="4-6 digits"
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-pin-confirm-online">Confirm PIN</Label>
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
                placeholder="Re-enter PIN"
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            {setupPinError && <p className="text-xs text-destructive">{setupPinError}</p>}
            <Button onClick={handleSetupPin} disabled={busy} className="w-full" size="lg">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save PIN
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
