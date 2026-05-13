import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CameraCapture } from "@/components/CameraCapture";
import { AssessmentResult } from "@/components/AssessmentResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Loader2, ScanLine, ChevronRight, Save, Volume2 } from "lucide-react";
import { triageImage, detectEngine, isLoaded, loadEngine } from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import type { TriageResult, Patient, Assessment } from "@/types/trij";
import { getDB } from "@/lib/db";
import { queuePatient, queueAssessment } from "@/lib/sync";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { VoiceAssistant } from "@/lib/voice";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/triage")({
  head: () => ({ meta: [{ title: "New triage — Trij" }] }),
  component: () => (
    <ErrorBoundary kind="triage">
      <TriagePage />
    </ErrorBoundary>
  ),
});

type Step = "patient" | "capture" | "analyzing" | "result";

function TriagePage() {
  const user = useSessionStore((s) => s.user);
  const language = useSettingsStore((s) => s.language);
  const engineKind = useSettingsStore((s) => s.engineKind);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const minConfidenceForLocalCare = useSettingsStore((s) => s.minConfidenceForLocalCare);
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("patient");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "other">("F");
  const [image, setImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);

  const startPatient = async () => {
    if (!user || !identifier.trim()) return;
    const p: Patient = {
      id: crypto.randomUUID(),
      chwUserId: user.id,
      identifier: identifier.trim(),
      ageYears: age ? Number(age) : undefined,
      sex,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await queuePatient(p);
    setPatient(p);
    setStep("capture");
  };

  const onCapture = async (dataUrl: string) => {
    setImage(dataUrl);
    setStep("analyzing");
    try {
      const kind = engineKind === "auto" ? await detectEngine() : engineKind;

      if (kind === "webllm" && !isLoaded(kind)) {
        await loadEngine(kind, (r) => {
          setProgress(Math.round((r.progress || 0) * 100));
          setProgressText(r.text || "Loading model...");
        });
      }
      setProgressText("Analyzing image...");
      setProgress(100);
      const r = await triageImage(dataUrl, language, kind, ollamaUrl);
      setResult(r);
      setStep("result");
    } catch (err) {
      toast.error("Inference failed: " + (err as Error).message);
      setStep("capture");
    }
  };

  const save = async () => {
    if (!user || !patient || !result || !image) return;
    const a: Assessment = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      chwUserId: user.id,
      images: [image],
      condition: result.condition,
      confidence: result.confidence,
      urgency: result.urgency,
      possibleConditions: result.possible_conditions,
      keyVisualFeatures: result.key_visual_features,
      recommendation: result.recommendation,
      followUpQuestions: result.follow_up_questions,
      referralAdvised: result.referral_advised,
      referralStatus: result.referral_advised ? "pending" : "none",
      patientConsent: consent,
      consentTimestamp: new Date().toISOString(),
      language,
      createdAt: new Date().toISOString(),
    };
    await queueAssessment(a);
    toast.success("Saved offline. Will sync when online.");
    navigate({ to: "/_app/patients/$patientId", params: { patientId: patient.id } });
  };

  const speak = (text: string) => {
    const v = new VoiceAssistant(language);
    v.speak(text);
  };

  return (
    <>
      <AppHeader title="New triage" subtitle="Step by step" />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <Stepper step={step} />

        {step === "patient" && (
          <div className="mt-7 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Who is the patient?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use a non-identifying code (e.g. initials + clinic ID).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Patient identifier</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. AP-0142"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Age (years)</Label>
                <Input value={age} onChange={(e) => setAge(e.target.value)} type="number" min={0} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label>Sex</Label>
                <div className="flex rounded-lg border p-1">
                  {(["F", "M", "other"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSex(s)}
                      className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${sex === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-xl border bg-secondary/20 p-4">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
              />
              <span className="text-xs leading-relaxed text-muted-foreground">
                The patient has been informed and consents to this AI-assisted
                preliminary assessment.
              </span>
            </label>
            <Button onClick={startPatient} disabled={!identifier.trim() || !consent} size="lg" className="w-full gap-2">
              Continue <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === "capture" && (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
              <ScanLine className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Frame the affected area inside the guides.</p>
                <p className="mt-1 text-muted-foreground">
                  Good lighting, steady hand, fill the frame.
                </p>
              </div>
            </div>
            <WebGPUCheck engineKind={engineKind} ollamaUrl={ollamaUrl} compact />
            <CameraCapture onCapture={onCapture} onCancel={() => setStep("patient")} />
          </div>
        )}

        {step === "analyzing" && (
          <div className="mt-10 flex flex-col items-center gap-5 text-center">
            {image && (
              <img src={image} alt="" className="h-40 w-40 rounded-2xl object-cover ring-4 ring-primary/20" />
            )}
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="w-full max-w-sm space-y-2">
              <p className="text-sm font-medium">{progressText || "Preparing..."}</p>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">
                Running locally on this device. No data is sent.
              </p>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="mt-6 space-y-5">
            {image && (
              <img src={image} alt="" className="aspect-video w-full rounded-2xl object-cover" />
            )}
            <AssessmentResult result={result} onSpeak={speak} minConfidenceForLocalCare={minConfidenceForLocalCare} />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => speak(result.recommendation)}>
                <Volume2 className="h-4 w-4" /> Read
              </Button>
              <Button onClick={save} className="flex-1 gap-2" size="lg">
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Stepper({ step }: { step: Step }) {
  const stages: Step[] = ["patient", "capture", "analyzing", "result"];
  const idx = stages.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}
