import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CameraCapture } from "@/components/CameraCapture";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { analyzeDocument, detectEngine } from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import type { DocumentResult } from "@/types/trij";
import { useSettingsStore } from "@/stores/settingsStore";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/document")({
  head: () => ({ meta: [{ title: "Document scan — Trij" }] }),
  component: () => (
    <ErrorBoundary kind="document">
      <DocumentScan />
    </ErrorBoundary>
  ),
});

function DocumentScan() {
  const language = useSettingsStore((s) => s.language);
  const engineKind = useSettingsStore((s) => s.engineKind);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const navigate = useNavigate();
  const [step, setStep] = useState<"capture" | "analyzing" | "result">("capture");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const onCapture = async (dataUrl: string) => {
    setImage(dataUrl);
    setStep("analyzing");
    try {
      setProgressText("Reading document...");
      setProgress(100);
      const kind = engineKind === "auto" ? await detectEngine() : engineKind;
      const r = await analyzeDocument(dataUrl, language, kind, ollamaUrl);
      setResult(r);
      setStep("result");
    } catch (err) {
      toast.error("Failed: " + (err as Error).message);
      setStep("capture");
    }
  };

  return (
    <>
      <AppHeader title="Scan document" subtitle="Lab, prescription, referral" />
      <div className="mx-auto max-w-2xl px-5 py-6">
        {step === "capture" && (
          <div className="space-y-4">
            <WebGPUCheck engineKind={engineKind} ollamaUrl={ollamaUrl} compact />
            <CameraCapture onCapture={onCapture} onCancel={() => navigate({ to: "/dashboard" })} />
          </div>
        )}
        {step === "analyzing" && (
          <div className="mt-10 flex flex-col items-center gap-5 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="w-full max-w-sm space-y-2">
              <p className="text-sm font-medium">{progressText}</p>
              <Progress value={progress} />
            </div>
          </div>
        )}
        {step === "result" && result && (
          <div className="mt-2 space-y-5">
            {image && (
              <img src={image} alt="" className="aspect-video w-full rounded-2xl object-cover" />
            )}
            <div className="rounded-3xl border bg-card p-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {result.document_type.replace("_", " ")}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold">{result.summary}</h2>
              {result.plain_language_explanation && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {result.plain_language_explanation}
                </p>
              )}
            </div>
            {result.key_findings.length > 0 && (
              <div className="rounded-3xl border bg-card p-6">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Key findings
                </h3>
                <ul className="mt-3 divide-y">
                  {result.key_findings.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        {f.is_abnormal && (
                          <AlertTriangle className="h-3.5 w-3.5 text-urgency-red" />
                        )}
                        <span className={f.is_abnormal ? "font-semibold text-urgency-red" : ""}>
                          {f.parameter}
                        </span>
                      </div>
                      <span className="font-mono text-xs">{f.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button className="w-full" onClick={() => setStep("capture")}>
              Scan another
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
