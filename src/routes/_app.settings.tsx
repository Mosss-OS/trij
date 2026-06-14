import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { ModelDownloadManager } from "@/components/ModelDownloadManager";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGES } from "@/lib/voice";
import { LANGUAGE_INFO } from "@/lib/i18n";
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
import { useNavigate, Link } from "@tanstack/react-router";
import { Slider } from "@/components/ui/slider";
import {
  LogOut,
  AlertTriangle,
  ShieldCheck,
  FlaskConical,
  Rabbit,
  KeyRound,
  Volume2,
  UserPlus,
  Copy,
  Check,
  Loader2,
  Play,
  ChevronRight,
  Beaker,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  detectOllama,
  type EngineKind,
  PHI_VISION_MODEL_ID,
  GEMMA4_E2B_MODEL_ID,
} from "@/lib/gemma";
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
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      {
        title: "Settings — Language, Voice & AI Engine | Trij Medical Triage",
      },
      {
        name: "description",
        content:
          "Configure Trij settings: choose AI inference engine (WebLLM, Ollama, cloud, or demo), set interface language (English, French, Swahili, Hindi, Arabic, Portuguese), adjust voice guidance, manage storage, and set up offline PIN access.",
      },
      {
        name: "keywords",
        content:
          "medical app settings, AI inference setup, WebGPU medical AI, Ollama healthcare, multilingual medical app, voice guidance healthcare, offline PIN, medical app configuration",
      },
      {
        property: "og:title",
        content: "Settings — Configure Trij Medical Triage",
      },
      {
        property: "og:description",
        content:
          "Configure AI engine, language, voice guidance, and privacy settings for Trij medical triage app.",
      },
      {
        name: "twitter:title",
        content: "Settings — Configure Trij Medical Triage",
      },
      {
        name: "twitter:description",
        content:
          "Configure AI engine, language, voice guidance, and privacy settings for Trij medical triage app.",
      },
    ],
  }),
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
  const sessionUser = useSessionStore((s) => s.user);
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const [hasPin, setHasPin] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [codes, setCodes] = useState<
    { code: string; used_by_user_id: string | null; used_at: string | null; created_at: string }[]
  >([]);
  const [genBusy, setGenBusy] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [demoWarningOpen, setDemoWarningOpen] = useState(false);

  // Sanitize persisted engine kind — "wasm" and "cpu" are not directly selectable
  useEffect(() => {
    const valid: Array<EngineKind | "auto"> = [
      "webllm",
      "ollama",
      "demo",
      "cloud",
      "google",
      "auto",
    ];
    if (!valid.includes(s.engineKind)) {
      s.setEngineKind("auto");
    }
  }, []);

  const handleEngineChange = (v: string) => {
    if (v === "demo") {
      setDemoWarningOpen(true);
    } else {
      s.setEngineKind(v as EngineKind | "auto");
      if (v === "google" && !s.modelId.startsWith("gemini") && !s.modelId.startsWith("gemma")) {
        s.setModelId("gemini-2.0-flash");
      }
    }
  };

  const confirmDemo = () => {
    s.setEngineKind("demo");
    setDemoWarningOpen(false);
    console.warn("[Trij] Demo mode activated — results are simulated, not for patient care");
  };

  useEffect(() => {
    if (offlineUser) {
      hasPinForUser(offlineUser.id)
        .then(setHasPin)
        .catch(() => setHasPin(false));
    }
  }, [offlineUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session.session) return;
        const { data: hasRole } = await (supabase.rpc as any)("has_role", {
          _user_id: session.session.user.id,
          _role: "supervisor",
        });
        if (cancelled) return;
        setIsSupervisor(!!hasRole);
        if (hasRole) {
          const { data: codesData } = await (supabase.from as any)("supervisor_codes")
            .select("code, used_by_user_id, used_at, created_at")
            .order("created_at", { ascending: false });
          if (cancelled) return;
          setCodes(codesData ?? []);
        }
      } catch (err) {
        console.warn("[Trij] Failed to check supervisor role:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateCode = async () => {
    setGenBusy(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "")}/functions/v1/generate-supervisor-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
          },
        },
      );
      const data = await res.json();
      if (data.code) {
        setCodes((prev) => [
          {
            code: data.code,
            used_by_user_id: null,
            used_at: null,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        navigator.clipboard?.writeText(data.code);
        toast.success(`Code ${data.code} generated and copied!`);
      } else {
        toast.error(data.error ?? "Failed to generate code");
      }
    } catch {
      toast.error("Failed to generate code");
    } finally {
      setGenBusy(false);
    }
  };

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
    {
      value: "auto",
      label: "Auto-detect",
      desc: "Cloud (mobile) / WebGPU → Ollama → Demo (desktop)",
    },
    { value: "webllm", label: "WebLLM (WebGPU)", desc: "In-browser Gemma via WebGPU" },
    { value: "ollama", label: "Ollama (local)", desc: "Local Ollama server" },
    {
      value: "google",
      label: "Google AI Studio",
      desc: "Gemini API via Google AI Studio (free tier)",
    },
    { value: "cloud", label: "Cloud inference", desc: "Remote Gemma 4 26B via Supabase" },
    { value: "demo", label: "Demo mode", desc: "Mock data, no real model needed" },
  ];

  return (
    <>
      <AppHeader title={t("settings")} />
      <div className="mx-auto max-w-4xl space-y-6 px-5 py-6">
        <Section title="Accessibility">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("kioskMode")}</Label>
                <p className="text-xs text-muted-foreground">{t("kioskModeDesc")}</p>
              </div>
              <Switch checked={s.kioskMode} onCheckedChange={s.setKioskMode} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("fieldMode")}</Label>
                <p className="text-xs text-muted-foreground">{t("fieldModeDesc")}</p>
              </div>
              <Switch
                checked={s.fieldMode}
                onCheckedChange={(enabled) => {
                  s.setFieldMode(enabled);
                  if (enabled) toast.success(t("fieldModeActive"));
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("pictogramMode")}</Label>
                <p className="text-xs text-muted-foreground">{t("pictogramModeDesc")}</p>
              </div>
              <Switch
                checked={s.pictogramMode}
                onCheckedChange={(enabled) => {
                  s.setPictogramMode(enabled);
                  if (enabled) toast.success(t("pictogramModeActive"));
                }}
              />
            </div>
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
                {LANGUAGES.map((l) => {
                  const info = LANGUAGE_INFO.find((i) => i.code === l.code);
                  return (
                    <SelectItem key={l.code} value={l.code}>
                      <span className="flex items-center gap-2">
                        {l.label}
                        {info?.status === "certified" && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            Certified
                          </span>
                        )}
                        {info?.status === "conditional" && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Conditional
                          </span>
                        )}
                        {info?.status === "draft" && (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                            Draft
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
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
            <Select value={s.engineKind} onValueChange={handleEngineChange}>
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

          {s.engineKind === "webllm" && (
            <div className="space-y-1.5">
              <Label>WebLLM model</Label>
              <Select value={s.modelId} onValueChange={s.setModelId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PHI_VISION_MODEL_ID}>
                    Phi-3.5 Vision (4 GB) — Images + Text
                  </SelectItem>
                  <SelectItem value={GEMMA4_E2B_MODEL_ID}>
                    Gemma 4 E2B (1.5 GB) — Text Only
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {s.modelId === GEMMA4_E2B_MODEL_ID
                  ? "Faster to load, best for follow-up questions and voice. Phi-3.5 Vision is loaded automatically when you triage an image or analyze a document."
                  : "Vision-capable. Supports image triage, document analysis, follow-up questions, and voice."}
              </p>
            </div>
          )}

          {s.engineKind === "google" && (
            <div className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="space-y-1.5">
                <Label>Google AI Studio API Key</Label>
                <Input
                  type="password"
                  value={s.googleApiKey}
                  onChange={(e) => s.setGoogleApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Get your free API key from{" "}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    aistudio.google.com/apikey
                  </a>
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select
                  value={
                    s.modelId.startsWith("gemini") || s.modelId.startsWith("gemma")
                      ? s.modelId
                      : "gemini-2.0-flash"
                  }
                  onValueChange={s.setModelId}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (fast, free)</SelectItem>
                    <SelectItem value="gemini-2.0-flash-lite">
                      Gemini 2.0 Flash-Lite (cheapest, free)
                    </SelectItem>
                    <SelectItem value="gemini-2.5-flash">
                      Gemini 2.5 Flash (balanced, free)
                    </SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (best quality)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Gemini 2.0 Flash is recommended. It's free and supports image analysis.
                </p>
              </div>
            </div>
          )}

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
          <a
            href="/docs/compliance/COMPLIANCE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-1 rounded-xl border bg-card p-3 text-sm font-medium hover:bg-muted/50"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="flex-1">{t("complianceReadMore")}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
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

        {isSupervisor && (
          <Section title="Supervisor Codes">
            <p className="text-xs text-muted-foreground">
              Generate invitation codes that CHWs can enter during signup to link themselves to you.
            </p>
            <Button onClick={generateCode} disabled={genBusy} className="gap-2">
              {genBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              Generate new code
            </Button>
            {codes.length > 0 && (
              <ul className="space-y-2">
                {codes.map((c, i) => (
                  <li
                    key={c.code}
                    className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/20 p-3"
                  >
                    <div className="min-w-0">
                      <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm font-semibold tracking-wider">
                        {c.code}
                      </code>
                      {c.used_by_user_id ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">Used</p>
                      ) : (
                        <p className="mt-0.5 text-xs text-emerald-600">Available</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => {
                        navigator.clipboard?.writeText(c.code);
                        setCopiedIdx(i);
                        setTimeout(() => setCopiedIdx(null), 2000);
                      }}
                    >
                      {copiedIdx === i ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

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
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label>{t("encryptData")}</Label>
                  <p className="text-xs text-muted-foreground">{t("encryptDataDesc")}</p>
                </div>
                <Switch
                  checked={s.encryptionEnabled}
                  onCheckedChange={(enabled) => {
                    s.setEncryptionEnabled(enabled);
                    toast.success(enabled ? t("encryptionEnabled") : t("encryptionDisabled"));
                  }}
                />
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

        <Section title={t("display")}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("theme")}</Label>
              <Select
                value={s.theme}
                onValueChange={(value: "light" | "dark" | "system") => s.setTheme(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">{t("systemDefault")}</SelectItem>
                  <SelectItem value="light">{t("light")}</SelectItem>
                  <SelectItem value="dark">{t("dark")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("themeDesc")}</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sunlight-mode">{t("sunlightMode")}</Label>
                <p className="text-xs text-muted-foreground">{t("sunlightModeDesc")}</p>
              </div>
              <Switch
                id="sunlight-mode"
                checked={s.sunlightMode}
                onCheckedChange={s.setSunlightMode}
              />
            </div>
          </div>
        </Section>

        <Section title={t("security")}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>{t("autoLock")}</Label>
                <p className="text-xs text-muted-foreground">{t("autoLockDesc")}</p>
              </div>
              <select
                value={s.lockTimeoutMinutes}
                onChange={(e) => s.setLockTimeoutMinutes(Number(e.target.value))}
                className="ml-4 rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={0}>{t("never")}</option>
                <option value={1}>1 {t("minute")}</option>
                <option value={5}>5 {t("minutes")}</option>
                <option value={10}>10 {t("minutes")}</option>
                <option value={30}>30 {t("minutes")}</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>{t("biometricAuth")}</Label>
                <p className="text-xs text-muted-foreground">{t("biometricAuthDesc")}</p>
              </div>
              <Switch
                checked={s.biometricEnabled}
                onCheckedChange={(enabled) => {
                  if (enabled) {
                    import("@/lib/webauthn").then(({ registerBiometric, isBiometricAvailable }) => {
                      isBiometricAvailable().then((avail) => {
                        if (!avail) {
                          toast.error(t("biometricNotAvailable"));
                          return;
                        }
                        registerBiometric(sessionUser?.id || s.chwName || "user").then((ok) => {
                          if (ok) s.setBiometricEnabled(true);
                          else toast.error(t("biometricSetupFailed"));
                        });
                      });
                    });
                  } else {
                    import("@/lib/webauthn").then(({ unregisterBiometric }) => {
                      unregisterBiometric();
                      s.setBiometricEnabled(false);
                    });
                  }
                }}
              />
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
          <div className="mt-4 flex gap-3">
            <Link
              to="/faq"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium hover:bg-muted/50"
            >
              FAQ
            </Link>
            <Link
              to="/help"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card p-3 text-sm font-medium hover:bg-muted/50"
            >
              {t("help")}
            </Link>
          </div>
        </Section>

        <Section title={t("modelBiasAudit")}>
          <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-medium">
                {t("biasAuditStatus")}{" "}
                <span className="text-amber-500">{t("biasAuditPending")}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("biasAuditDesc")}</p>
              <a
                href="/BIAS_AUDIT.md"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t("biasAuditReadMore")}
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-3 rounded-2xl border bg-card p-4">
            <Beaker className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium">
                {t("clinicalValidationStatus")}{" "}
                <span className="text-blue-500">{t("validationInProgress")}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t("validationDesc")}</p>
              <a
                href="/CLINICAL_VALIDATION.md"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {t("validationReadMore")}
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </div>
        </Section>

        <ModelDownloadManager />

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => useSettingsStore.getState().resetTutorial()}
        >
          <Play className="h-4 w-4" /> {t("retakeTutorial")}
        </Button>

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

      <Dialog open={demoWarningOpen} onOpenChange={setDemoWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-urgency-red">
              <AlertTriangle className="h-5 w-5" />
              Demo Mode — Not for Medical Use
            </DialogTitle>
            <DialogDescription className="pt-2">
              Demo mode returns <strong>simulated results</strong> for testing only. Do{" "}
              <strong>not</strong> use for actual patient assessment.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <p className="font-medium">If you select demo mode:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>All assessments will contain fake, plausible-sounding results</li>
              <li>A persistent red banner will appear on every screen</li>
              <li>Switch to WebLLM, Ollama, or Cloud to return to real assessments</li>
            </ul>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDemoWarningOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDemo}>
              Enter Demo Mode
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-4 sm:p-6">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
