import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModelDownloadManager } from "@/components/ModelDownloadManager";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGES } from "@/lib/voice";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import { LogOut, AlertTriangle, ShieldCheck, FlaskConical, Rabbit, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { detectOllama, type EngineKind } from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import { OllamaSetup } from "@/components/OllamaSetup";
import { StorageMonitor } from "@/components/StorageMonitor";
import { useGemma } from "@/hooks/useGemma";
import { useSessionStore } from "@/stores/sessionStore";
import { hasPinForUser, setupPin } from "@/lib/pin-auth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Trij" }] }),
  component: () => (
    <ErrorBoundary kind="engine">
      <SettingsPage />
    </ErrorBoundary>
  ),
});

function SettingsPage() {
  const s = useSettingsStore();
  const navigate = useNavigate();
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const gemma = useGemma();
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const [hasPin, setHasPin] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  useEffect(() => {
    if (offlineUser) {
      hasPinForUser(offlineUser.id).then(setHasPin);
    }
  }, [offlineUser]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* no-op for offline/demo mode */
    }
    useSessionStore.getState().clearAuth();
    navigate({ to: "/" });
  };

  const engineOptions: { value: EngineKind | "auto"; label: string; desc: string }[] = [
    { value: "auto", label: "Auto-detect", desc: "WebGPU → Ollama → Demo" },
    { value: "webllm", label: "WebLLM (WebGPU)", desc: "In-browser Gemma via WebGPU" },
    { value: "ollama", label: "Ollama (local)", desc: "Local Ollama server" },
    { value: "demo", label: "Demo mode", desc: "Mock data, no real model needed" },
  ];

  return (
    <>
      <AppHeader title="Settings" />
      <div className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        <Section title="Language & voice">
          <div className="space-y-1.5">
            <Label>Interface & speech language</Label>
            <Select value={s.language} onValueChange={s.setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Voice assistant</Label>
              <p className="text-xs text-muted-foreground">
                Read assessments aloud, listen for follow-ups.
              </p>
            </div>
            <Switch checked={s.voiceEnabled} onCheckedChange={s.setVoiceEnabled} />
          </div>
        </Section>

        <Section title="AI engine">
          <div className="space-y-1.5">
            <Label>Inference engine</Label>
            <Select
              value={s.engineKind}
              onValueChange={(v) => s.setEngineKind(v as EngineKind | "auto")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {engineOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {engineOptions.find((o) => o.value === s.engineKind)?.desc}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Enable extended reasoning</Label>
              <p className="text-xs text-muted-foreground">
                Slower but more accurate step-by-step thinking (Gemma 4 only)
              </p>
            </div>
            <Switch checked={s.thinkingMode} onCheckedChange={s.setThinkingMode} />
          </div>

          <WebGPUCheck engineKind={s.engineKind} ollamaUrl={s.ollamaUrl} />

          <div className="flex flex-wrap gap-4 rounded-2xl border bg-secondary/40 p-4 text-xs">
            <div className="flex items-center gap-2">
              <Rabbit className="h-3.5 w-3.5 text-primary" />
              <span>Ollama: {ollamaOk === null ? "..." : ollamaOk ? "Detected" : "Not found"}</span>
            </div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              <span>Active: {gemma.kind}</span>
            </div>
          </div>
        </Section>

        <Section title="Ollama configuration">
          <OllamaSetup />
        </Section>

        <Section title="Privacy">
          <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">All AI inference runs on this device.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Patient images are never sent to a cloud AI service. Records sync to your encrypted
                backend only when you have connectivity.
              </p>
            </div>
          </div>
          {gemma.kind === "webllm" && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow cloud fallback</Label>
                <p className="text-xs text-muted-foreground">
                  Send images to a hosted Gemma if on-device fails. Off by default.
                </p>
              </div>
              <Switch
                checked={s.cloudFallbackConsent}
                onCheckedChange={s.setCloudFallbackConsent}
              />
            </div>
          )}
        </Section>

        {offlineUser && (
          <Section title="Offline PIN">
            <div className="rounded-2xl border bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {hasPin ? "Offline PIN is set" : "No offline PIN configured"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasPin
                      ? "You can sign in without internet using your PIN."
                      : "Set a 4-6 digit PIN to access Trij when offline."}
                  </p>
                </div>
                <Button
                  variant={hasPin ? "outline" : "default"}
                  size="sm"
                  onClick={() => setShowPinSetup(true)}
                >
                  {hasPin ? "Change" : "Set up"}
                </Button>
              </div>
            </div>
          </Section>
        )}

        <Section title="Storage">
          <StorageMonitor />
        </Section>

        <Section title="Medical">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Minimum confidence for local care</Label>
                <span className="font-mono text-sm font-semibold">
                  {s.minConfidenceForLocalCare}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[s.minConfidenceForLocalCare]}
                onValueChange={([v]) => s.setMinConfidenceForLocalCare(v)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% — always refer</span>
                <span>100% — never refer</span>
              </div>
              <p className="text-xs text-muted-foreground">
                When AI confidence is below this threshold, the app will recommend referral
                regardless of the model&apos;s assessment. Default: 70%.
              </p>
            </div>
          </div>
        </Section>

        <div className="rounded-3xl border bg-card p-6">
          <h2 className="font-display text-base font-semibold">Engine status</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed">
            {JSON.stringify(
              {
                kind: gemma.kind,
                loaded: gemma.loaded,
                loading: gemma.loading,
                error: gemma.error,
              },
              null,
              2,
            )}
          </pre>
        </div>

        <Section title="About Trij">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong>Trij</strong> is an AI-assisted preliminary triage tool for community health
              workers. It is <strong>not</strong> a clinical diagnostic device.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>All assessments are preliminary and must be verified with clinical judgment.</li>
              <li>Trij does not replace professional medical evaluation.</li>
              <li>Always refer patients when in doubt or when urgency is indicated.</li>
              <li>Patient data is stored on-device and synced to your encrypted backend.</li>
              <li>You are responsible for complying with local health data privacy regulations.</li>
            </ul>
            <p className="text-xs">Trij &mdash; Gemma 4 Good Hackathon 2026</p>
          </div>
        </Section>

        <ModelDownloadManager />

        <Button variant="outline" className="w-full gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>

      <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{hasPin ? "Change offline PIN" : "Set up offline PIN"}</DialogTitle>
            <DialogDescription>
              Choose a 4-6 digit PIN to sign in when you don't have internet access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="settings-pin">New PIN</Label>
              <Input
                id="settings-pin"
                type="password"
                inputMode="numeric"
                value={pinValue}
                onChange={(e) => {
                  setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinError("");
                }}
                placeholder="4-6 digits"
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-pin-confirm">Confirm PIN</Label>
              <Input
                id="settings-pin-confirm"
                type="password"
                inputMode="numeric"
                value={pinConfirm}
                onChange={(e) => {
                  setPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setPinError("");
                }}
                placeholder="Re-enter PIN"
                className="text-center text-2xl tracking-[0.5em]"
                maxLength={6}
              />
            </div>
            {pinError && <p className="text-xs text-destructive">{pinError}</p>}
            <Button
              onClick={async () => {
                if (!offlineUser) return;
                if (pinValue.length < 4) {
                  setPinError("PIN must be 4-6 digits");
                  return;
                }
                if (pinValue !== pinConfirm) {
                  setPinError("PINs do not match");
                  return;
                }
                setPinBusy(true);
                try {
                  await setupPin(offlineUser.id, offlineUser.email, pinValue);
                  setHasPin(true);
                  setShowPinSetup(false);
                  setPinValue("");
                  setPinConfirm("");
                  toast.success("Offline PIN configured successfully");
                } catch (err) {
                  setPinError((err as Error).message);
                } finally {
                  setPinBusy(false);
                }
              }}
              disabled={pinBusy}
              className="w-full"
              size="lg"
            >
              {pinBusy ? "Saving..." : "Save PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-6">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
