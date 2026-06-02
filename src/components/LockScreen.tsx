import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { hasPinForUser, verifyPin } from "@/lib/pin-auth";
import { authenticateBiometric } from "@/lib/webauthn";
import { deriveKey, cacheKey, clearKey } from "@/lib/crypto";
import { Lock, Fingerprint, AlertTriangle, Loader2, LogOut } from "lucide-react";

export function LockScreen() {
  const { t } = useI18n();
  const setScreenLocked = useSessionStore((s) => s.setScreenLocked);
  const clearAuth = useSessionStore((s) => s.clearAuth);
  const user = useSessionStore((s) => s.user);
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const encryptionSalt = useSettingsStore((s) => s.encryptionSalt);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [usePin, setUsePin] = useState(false);
  const [bioAttempts, setBioAttempts] = useState(0);
  const [noPinConfigured, setNoPinConfigured] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    clearKey();
    if (user?.id) {
      hasPinForUser(user.id).then((exists) => {
        if (mountedRef.current) {
          setNoPinConfigured(!exists);
          setCheckingPin(false);
        }
      });
    } else {
      setCheckingPin(false);
    }
  }, [biometricEnabled]);

  const retryBiometric = async () => {
    if (verifying) return;
    setVerifying(true);
    try {
      const ok = await authenticateBiometric();
      if (ok && mountedRef.current) setScreenLocked(false);
      else if (mountedRef.current) setBioAttempts((a) => a + 1);
    } finally {
      if (mountedRef.current) setVerifying(false);
    }
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (usePin) inputRefs.current[0]?.focus();
  }, [usePin]);

  const handleDigit = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin];
    next[idx] = val;
    setPin(next);
    setError("");

    if (val && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    if (val && idx === 5) {
      submitPin([...next.slice(0, 5), val]);
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "Enter") {
      submitPin(pin);
    }
  };

  const submitPin = async (currentPin: string[]) => {
    const fullPin = currentPin.join("");
    if (fullPin.length < 6) return;
    setVerifying(true);
    setError("");
    try {
      const valid = await verifyPin(user?.id || "", fullPin);
      if (valid) {
        const key = await deriveKey(fullPin, encryptionSalt);
        cacheKey(key);
        setScreenLocked(false);
      } else {
        setError(t("incorrectPin"));
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError(t("pinError"));
    } finally {
      setVerifying(false);
    }
  };

  if (checkingPin) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (biometricEnabled && bioAttempts < 3 && !usePin) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={retryBiometric}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-colors hover:bg-primary/20"
            aria-label={t("useBiometricToUnlock")}
          >
            <Fingerprint className="h-7 w-7 text-primary" />
          </button>
          <h1 className="mt-2 font-display text-xl font-semibold">Trij</h1>
          <p className="text-sm text-muted-foreground">{t("useBiometricToUnlock")}</p>
        </div>
        {verifying && <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />}
        <button
          onClick={() => setUsePin(true)}
          className="mt-8 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {noPinConfigured ? t("signOut") : t("usePinInstead")}
        </button>
      </div>
    );
  }

  if (noPinConfigured) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Lock className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="mt-2 font-display text-xl font-semibold">{t("trij")}</h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            No PIN has been configured for this account. The app locked due to inactivity, but there
            is no PIN to unlock it.
          </p>
          <p className="text-xs text-muted-foreground text-center max-w-xs mt-2">
            Sign out and start fresh, or contact your supervisor for assistance.
          </p>
        </div>
        <button
          onClick={() => {
            clearAuth();
            setScreenLocked(false);
          }}
          className="mt-8 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="mt-2 font-display text-xl font-semibold">Trij</h1>
        <p className="text-sm text-muted-foreground">{t("enterPinToUnlock")}</p>
      </div>

      <div className="mt-8 flex gap-3">
        {pin.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`h-12 w-10 rounded-xl border-2 bg-card text-center text-lg font-bold tracking-widest outline-none transition-colors ${
              error
                ? "border-destructive"
                : d
                  ? "border-primary"
                  : "border-input focus:border-primary"
            }`}
            aria-label={`${t("pinDigit")} ${i + 1}`}
          />
        ))}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {verifying && <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />}

      {biometricEnabled && (
        <button
          onClick={() => {
            setUsePin(false);
            setBioAttempts(0);
          }}
          className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t("useBiometricInstead")}
        </button>
      )}
    </div>
  );
}
