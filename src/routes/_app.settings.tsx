import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
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
import { LogOut, AlertTriangle, ShieldCheck, FlaskConical, Rabbit, KeyRound, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { detectOllama, type EngineKind } from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import { OllamaSetup } from "@/components/OllamaSetup";
import { StorageMonitor } from "@/components/StorageMonitor";
import { useGemma } from "@/hooks/useGemma";
import { useSessionStore } from "@/stores/sessionStore";
import { hasPinForUser, setupPin } from "@/lib/pin-auth";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
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
    <I18nErrorBoundary kind="engine">
      <SettingsPage />
    </I18nErrorBoundary>
  ),
});

function SettingsPage() {
  const { t } = useI18n();
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
    { value: "cloud", label: "Cloud inference", desc: "Remote Gemma 4 26B via Supabase" },
    { value: "demo", label: "Demo mode", desc: "Mock data, no real model needed" },
  ];

  return (
    <>
      <AppHeader title={t("settings")} />
      <div className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        <Section title="Accessibility">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("kioskMode")}</Label>
              <p className="text-xs text-muted-foreground">{t("kioskModeDesc")}</p>
            </div>
            <Switch checked={s.kioskMode} onCheckedChange={s.setKioskMode} />
          </div>
        </Section>

        <Section title={t("languageAndVoice")}>
          <div className="space-y-1.5">
            <Label>{t("interfaceAndSpeech")}</Label>
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
              <Label>{t("voiceAssistant")}</Label>
              <p className="text-xs text-muted-foreground">{t("readAssessments")}</p>
            </div>
            <Switch checked={s.voiceEnabled} onCheckedChange={s.setVoiceEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("voiceGuidedMode")}</Label>
              <p className="text-xs text-muted-foreground">{t("voiceGuidedModeDesc")}</p>
            </div>
            <Switch
              checked={s.voiceGuidedMode}
              onCheckedChange={s.setVoiceGuidedMode}
              disabled={!s.voiceEnabled}
            />
          </div>
          {s.voiceEnabled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("voiceSpeed")}</Label>
                <span className="flex items-center gap-1 font-mono text-sm font-semibold">
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                  {s.voiceSpeed.toFixed(1)}x
                </span>
              </div>
              <Slider
                min={0.5}
                max={2.0}
                step={0.1}
                value={[s.voiceSpeed]}
                onValueChange={([v]) => s.setVoiceSpeed(v)}
              />
              <p className="text-xs text-muted-foreground">{t("voiceSpeedDesc")}</p>
            </div>
          )}
        </Section>

        <Section title={t("aiEngine")}>
          <div className="space-y-1.5">
            <Label>{t("inferenceEngine")}</Label>
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
              <Label>{t("extendedReasoning")}</Label>
              <p className="text-xs text-muted-foreground">{t("extendedReasoningDesc")}</p>
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

        <Section title={t("privacy")}>
          <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{t("localInference")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("privacyDesc")}</p>
            </div>
          </div>
          {gemma.kind === "webllm" && (
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("allowCloudFallback")}</Label>
                <p className="text-xs text-muted-foreground">{t("cloudFallbackDesc")}</p>
              </div>
              <Switch
                checked={s.cloudFallbackConsent}
                onCheckedChange={s.setCloudFallbackConsent}
              />
            </div>
          )}
        </Section>

        {offlineUser && (
          <Section title={t("offlinePin")}>
            <div className="rounded-2xl border bg-secondary/30 p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{hasPin ? t("pinIsSet") : t("noPin")}</p>
                  <p className="text-xs text-muted-foreground">
                    {hasPin ? t("pinDescSet") : t("pinDescNotSet")}
                  </p>
                </div>
                <Button
                  variant={hasPin ? "outline" : "default"}
                  size="sm"
                  onClick={() => setShowPinSetup(true)}
                >
                  {hasPin ? t("change") : t("setup")}
                </Button>
              </div>
            </div>
          </Section>
        )}

        <Section title={t("storage")}>
          <StorageMonitor />
        </Section>

        <Section title={t("medical")}>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("minConfidence")}</Label>
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
                <span>0% — {t("alwaysRefer")}</span>
                <span>100% — {t("neverRefer")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("confidenceDesc")}</p>
            </div>
          </div>
        </Section>

        <div className="rounded-3xl border bg-card p-6">
          <h2 className="font-display text-base font-semibold">{t("engineStatus")}</h2>
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

        <Section title={t("aboutTrij")}>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <strong>{t("trij")}</strong> {t("disclaimerTitle")}
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t("disclaimerItem1")}</li>
              <li>{t("disclaimerItem2")}</li>
              <li>{t("disclaimerItem3")}</li>
              <li>{t("disclaimerItem4")}</li>
              <li>{t("disclaimerItem5")}</li>
            </ul>
            <p className="text-xs">{t("trij")} &mdash; Gemma 4 Good Hackathon 2026</p>
          </div>
        </Section>

        <ModelDownloadManager />

        <Button variant="outline" className="w-full gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> {t("signOut")}
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
