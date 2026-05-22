import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { CameraCapture } from "@/components/CameraCapture";
import { ImageEditor } from "@/components/ImageEditor";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { analyzeDocument, detectEngine } from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import type { DocumentResult } from "@/types/trij";
import { useSettingsStore } from "@/stores/settingsStore";
import { Loader2, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AiFailureOverlay, classifyAiError } from "@/components/AiFailureOverlay";
import type { AiFailureKind } from "@/components/AiFailureOverlay";

export const Route = createFileRoute("/_app/document")({
  head: () => ({
    meta: [
      {
        title: "Medical Document Scanner — AI OCR | Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Free AI-powered medical document scanner. Analyze lab reports, prescriptions, and referral letters with on-device OCR. Get structured summaries and abnormal value highlights — no internet needed.",
      },
      {
        name: "keywords",
        content:
          "medical document scanner, OCR lab reports, prescription analysis AI, free document analyzer, offline medical OCR, healthcare document scanner, lab result reader",
      },
      {
        property: "og:title",
        content: "Medical Document Scanner — AI OCR | Trij",
      },
      {
        property: "og:description",
        content:
          "Free AI medical document scanner. Analyze lab reports and prescriptions on-device. No internet needed.",
      },
      {
        name: "twitter:title",
        content: "Medical Document Scanner — AI OCR | Trij",
      },
      {
        name: "twitter:description",
        content:
          "Free AI medical document scanner. Analyze lab reports and prescriptions on-device. No internet needed.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="document">
      <DocumentScan />
    </I18nErrorBoundary>
  ),
});

function DocumentScan() {
  const { t } = useI18n();
  const language = useSettingsStore((s) => s.language);
  const engineKind = useSettingsStore((s) => s.engineKind);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const navigate = useNavigate();
  const [step, setStep] = useState<"capture" | "edit" | "analyzing" | "result">("capture");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [aiFailureKind, setAiFailureKind] = useState<AiFailureKind | null>(null);
  const pendingImageRef = useRef<string | null>(null);

  const onCapture = (dataUrl: string) => {
    setImage(dataUrl);
    setStep("edit");
  };

  const onCropConfirm = async (dataUrl: string) => {
    setImage(dataUrl);
    setStep("analyzing");
    try {
      setProgressText(t("readingDocument"));
      setProgress(100);
      const kind = engineKind === "auto" ? await detectEngine() : engineKind;
      const r = await analyzeDocument(dataUrl, language, kind, ollamaUrl);
      setResult(r);
      setStep("result");
    } catch (err) {
      setAiFailureKind(classifyAiError(err));
      pendingImageRef.current = dataUrl;
      setStep("capture");
    }
  };

  return (
    <>
      <AppHeader title={t("scanningDoc")} subtitle={t("labPrescriptionReferral")} />
      <div className="mx-auto max-w-4xl px-5 py-6">
        {step === "capture" && (
          <div className="space-y-4">
            <WebGPUCheck engineKind={engineKind} ollamaUrl={ollamaUrl} compact />
            <CameraCapture onCapture={onCapture} onCancel={() => navigate({ to: "/dashboard" })} />
          </div>
        )}
        {step === "edit" && image && (
          <ImageEditor
            image={image}
            onConfirm={onCropConfirm}
            onRetake={() => setStep("capture")}
          />
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
              <img
                src={image}
                alt="Captured medical document being analyzed by AI"
                className="aspect-video w-full rounded-2xl object-cover"
              />
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
                  {t("keyFindings")}
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
              {t("scanAnother")}
            </Button>
          </div>
        )}
      </div>

      {aiFailureKind && (
        <AiFailureOverlay
          kind={aiFailureKind}
          onRetry={() => {
            setAiFailureKind(null);
            const data = pendingImageRef.current;
            pendingImageRef.current = null;
            if (!data) return;
            setStep("analyzing");
            setProgressText(t("readingDocument"));
            setProgress(100);
            const k = engineKind === "auto" ? detectEngine() : Promise.resolve(engineKind);
            k.then((kind) =>
              analyzeDocument(data, language, kind, ollamaUrl),
            ).then((r) => {
              setResult(r);
              setStep("result");
            }).catch((err) => {
              setAiFailureKind(classifyAiError(err));
              pendingImageRef.current = data;
              setStep("capture");
            });
          }}
          onUseDemo={() => {
            setAiFailureKind(null);
            const data = pendingImageRef.current;
            pendingImageRef.current = null;
            if (!data) return;
            setStep("analyzing");
            setProgressText(t("readingDocument"));
            setProgress(100);
            analyzeDocument(data, language, "demo", ollamaUrl).then((r) => {
              setResult(r);
              setStep("result");
            }).catch(() => {
              setStep("capture");
            });
          }}
          onDismiss={() => {
            setAiFailureKind(null);
            pendingImageRef.current = null;
            setStep("capture");
          }}
        />
      )}
    </>
  );
}
