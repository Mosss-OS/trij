import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { useSettingsStore } from "@/stores/settingsStore";
import { LANGUAGES } from "@/lib/voice";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Cpu, AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supportsWebGPU } from "@/lib/gemma";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — Trij" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = useSettingsStore();
  const navigate = useNavigate();
  const [webgpu, setWebgpu] = useState<boolean | null>(null);

  useEffect(() => {
    supportsWebGPU().then(setWebgpu);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <>
      <AppHeader title="Settings" />
      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        <Section title="Language & voice">
          <div className="space-y-1.5">
            <Label>Interface & speech language</Label>
            <Select value={s.language} onValueChange={s.setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Voice assistant</Label>
              <p className="text-xs text-muted-foreground">Read assessments aloud, listen for follow-ups.</p>
            </div>
            <Switch checked={s.voiceEnabled} onCheckedChange={s.setVoiceEnabled} />
          </div>
        </Section>

        <Section title="On-device model">
          <div className="rounded-2xl border bg-secondary/40 p-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">
                WebGPU: {webgpu === null ? "Checking..." : webgpu ? "Available" : "Not available"}
              </p>
            </div>
            {webgpu === false && (
              <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-urgency-yellow" />
                On-device inference unavailable on this browser. Use a recent
                Chrome/Edge on Android or desktop.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Model ID (WebLLM)</Label>
            <Input value={s.modelId} onChange={(e) => s.setModelId(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Defaults to closest published Gemma. Replace with the Gemma 4 E2B WebLLM ID when available.
            </p>
          </div>
        </Section>

        <Section title="Privacy">
          <div className="flex items-start gap-3 rounded-2xl border bg-secondary/30 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">All AI inference runs on this device.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Patient images are never sent to a cloud AI service. Records sync to your encrypted backend only when you have connectivity.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow cloud fallback</Label>
              <p className="text-xs text-muted-foreground">Send images to a hosted Gemma if on-device fails. Off by default.</p>
            </div>
            <Switch checked={s.cloudFallbackConsent} onCheckedChange={s.setCloudFallbackConsent} />
          </div>
        </Section>

        <Button variant="outline" className="w-full gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </main>
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
