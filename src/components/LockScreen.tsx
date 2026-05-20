import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { verifyPin } from "@/lib/pin-auth";
import { authenticateBiometric } from "@/lib/webauthn";
import { deriveKey, cacheKey, clearKey } from "@/lib/crypto";
import { Lock, Fingerprint, AlertTriangle, Loader2 } from "lucide-react";

export function LockScreen() {
  const { t } = useI18n();
  const setScreenLocked = useSessionStore((s) => s.setScreenLocked);
  const user = useSessionStore((s) => s.user);
  const biometricEnabled = useSettingsStore((s) => s.biometricEnabled);
  const encryptionSalt = useSettingsStore((s) => s.encryptionSalt);
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [usePin, setUsePin] = useState(false);
  const [bioAttempts, setBioAttempts] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    clearKey();
    if (biometricEnabled && bioAttempts < 3) {
      authenticateBiometric().then((ok) => {
        if (ok && mountedRef.current) setScreenLocked(false);
        else if (mountedRef.current) setBioAttempts((a) => a + 1);
      });
    }
  }, [biometricEnabled]);

  useEffect(() => {
    return () => { mountedRef.current = false; };
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

  if (biometricEnabled && bioAttempts < 3 && !usePin) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Fingerprint className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-2 font-display text-xl font-semibold">Trij</h1>
          <p className="text-sm text-muted-foreground">{t("useBiometricToUnlock")}</p>
        </div>
        {verifying && <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />}
        <button
          onClick={() => setUsePin(true)}
          className="mt-8 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t("usePinInstead")}
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
            ref={(el) => { inputRefs.current[i] = el; }}
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
          onClick={() => { setUsePin(false); setBioAttempts(0); }}
          className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {t("useBiometricInstead")}
        </button>
      )}
    </div>
  );
}
