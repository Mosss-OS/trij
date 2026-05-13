import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { LogOut, Cpu, AlertTriangle, ShieldCheck, FlaskConical, Rabbit } from "lucide-react";
import { useEffect, useState } from "react";
import { supportsWebGPU, detectOllama, clearOllamaCache, type EngineKind } from "@/lib/gemma";
import { useGemma } from "@/hooks/useGemma";

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
  const [webgpu, setWebgpu] = useState<boolean | null>(null);
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const gemma = useGemma();

  useEffect(() => {
    supportsWebGPU().then(setWebgpu);
  }, []);

  useEffect(() => {
    detectOllama(s.ollamaUrl).then(setOllamaOk);
  }, [s.ollamaUrl]);

  const signOut = async () => {
    await supabase.auth.signOut();
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

          <div className="flex flex-wrap gap-4 rounded-2xl border bg-secondary/40 p-4 text-xs">
            <div className="flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              <span>
                WebGPU:{" "}
                {webgpu === null ? "..." : webgpu ? "Available" : "Not available"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Rabbit className="h-3.5 w-3.5 text-primary" />
              <span>
                Ollama: {ollamaOk === null ? "..." : ollamaOk ? "Detected" : "Not found"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              <span>Active: {gemma.kind}</span>
            </div>
          </div>

          {s.engineKind === "webllm" && webgpu === false && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-urgency-yellow" />
              WebGPU not available. Use Chrome/Edge on Android or desktop. Switch to
              Ollama or Demo mode to proceed.
            </p>
          )}

          {webgpu === false && (
            <div className="space-y-1.5">
              <Label>WebLLM model ID</Label>
              <Input
                value={s.modelId}
                onChange={(e) => s.setModelId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Replace with Gemma 4 E2B WebLLM ID when published. Currently defaults
                to closest published Gemma variant.
              </p>
            </div>
          )}
        </Section>

        <Section title="Ollama configuration">
          <div className="space-y-1.5">
            <Label>Ollama URL</Label>
            <Input
              value={s.ollamaUrl}
              onChange={(e) => {
                s.setOllamaUrl(e.target.value);
                clearOllamaCache();
              }}
              placeholder="http://localhost:11434"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ollama model</Label>
            <Input
              value={s.ollamaModel}
              onChange={(e) => s.setOllamaModel(e.target.value)}
              placeholder="gemma4:latest"
            />
            <p className="text-xs text-muted-foreground">
              Pull the model first: <code>ollama pull gemma4</code>
            </p>
          </div>
          {ollamaOk === true && (
            <p className="text-xs text-emerald-600">
              Ollama server reachable. Model must be pulled separately.
            </p>
          )}
          {ollamaOk === false && s.engineKind !== "demo" && (
            <p className="text-xs text-muted-foreground">
              Ollama not detected at {s.ollamaUrl}. Install Ollama and pull Gemma 4,
              or switch to Demo mode.
            </p>
          )}
        </Section>

        <Section title="Privacy">
          <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">All AI inference runs on this device.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Patient images are never sent to a cloud AI service. Records sync to
                your encrypted backend only when you have connectivity.
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

        <div className="rounded-3xl border bg-card p-6">
          <h2 className="font-display text-base font-semibold">Engine status</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed">
            {JSON.stringify(
              {
                kind: gemma.kind,
                loaded: gemma.loaded,
                loading: gemma.loading,
                webgpu: webgpu,
                error: gemma.error,
              },
              null,
              2
            )}
          </pre>
        </div>

        <Button variant="outline" className="w-full gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-6">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
