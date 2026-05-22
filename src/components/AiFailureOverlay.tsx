import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Cpu, Timer, ImageOff, MousePointerClick, Loader2 } from "lucide-react";
import type { Urgency, TriageResult } from "@/types/trij";

export type AiFailureKind = "model_not_ready" | "timeout" | "oom" | "image_error" | "generic";

const FAILURE_ICONS: Record<AiFailureKind, typeof AlertTriangle> = {
  model_not_ready: Cpu,
  timeout: Timer,
  oom: Cpu,
  image_error: ImageOff,
  generic: AlertTriangle,
};

const MANUAL_CONDITIONS = [
  "Malaria",
  "Acute respiratory infection",
  "Diarrhoeal disease",
  "Hypertension",
  "Diabetes mellitus",
  "Wound infection",
  "Skin infection",
  "Malnutrition",
  "Anaemia",
  "Urinary tract infection",
  "Typhoid fever",
  "Dengue fever",
  "Tuberculosis",
  "HIV-related illness",
  "Other",
];

interface AiFailureOverlayProps {
  kind: AiFailureKind;
  onRetry: () => void;
  onUseDemo: () => void;
  onManualAssessment?: (result: TriageResult) => void;
  onDismiss: () => void;
}

export function AiFailureOverlay({
  kind,
  onRetry,
  onUseDemo,
  onManualAssessment,
  onDismiss,
}: AiFailureOverlayProps) {
  const { t } = useI18n();
  const [showManual, setShowManual] = useState(false);
  const [manualUrgency, setManualUrgency] = useState<Urgency>("yellow");
  const [manualCondition, setManualCondition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const Icon = FAILURE_ICONS[kind];

  const failureKey = (k: AiFailureKind) => {
    switch (k) {
      case "model_not_ready": return "aiFailureModelNotReady";
      case "timeout": return "aiFailureTimeout";
      case "oom": return "aiFailureOom";
      case "image_error": return "aiFailureImage";
      default: return "aiFailureGeneric";
    }
  };

    const handleManualSubmit = () => {
      setSubmitting(true);
      const result: TriageResult = {
        condition: manualCondition || "Unspecified condition",
        confidence: 0,
        urgency: manualUrgency,
        possible_conditions: manualCondition ? [{ name: manualCondition, probability: 100 }] : [],
        key_visual_features: [],
        recommendation:
          manualUrgency === "red"
            ? "Immediate referral required."
            : manualUrgency === "yellow"
              ? "Refer to clinic within 24 hours."
              : "Home care with monitoring. Refer if symptoms worsen.",
        referral_advised: manualUrgency !== "green",
        follow_up_questions: [],
      };
      setTimeout(() => {
        setSubmitting(false);
        onManualAssessment?.(result);
      }, 300);
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/15">
              <Icon className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="font-display text-lg font-semibold">{t("aiFailureTitle")}</h2>
          </div>
          <button onClick={onDismiss} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!showManual || !onManualAssessment ? (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t(failureKey(kind))}
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                {t("aiFailureNoAiGuidance")}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={onRetry} className="w-full gap-2">
                <Loader2 className="h-4 w-4" />
                {t("aiFailureRetry")}
              </Button>
              <Button variant="secondary" onClick={onUseDemo} className="w-full gap-2">
                <MousePointerClick className="h-4 w-4" />
                {t("aiFailureUseDemo")}
              </Button>
              {onManualAssessment && (
                <Button
                  variant="outline"
                  onClick={() => setShowManual(true)}
                  className="w-full gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t("aiFailureManual")}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {t("manualAssessmentDesc")}
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("manualUrgency")}
                </label>
                <div className="flex gap-2">
                  {(["green", "yellow", "red"] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setManualUrgency(u)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-center text-sm font-semibold transition-colors ${
                        manualUrgency === u
                          ? u === "red"
                            ? "border-urgency-red bg-urgency-red/10 text-urgency-red"
                            : u === "yellow"
                              ? "border-urgency-yellow bg-urgency-yellow/10 text-urgency-yellow"
                              : "border-urgency-green bg-urgency-green/10 text-urgency-green"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {u === "red" ? "Red" : u === "yellow" ? "Yellow" : "Green"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {t("manualCondition")}
                </label>
                <select
                  value={manualCondition}
                  onChange={(e) => setManualCondition(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select condition...</option>
                  {MANUAL_CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={handleManualSubmit}
                className="w-full gap-2"
                disabled={submitting || !manualUrgency}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MousePointerClick className="h-4 w-4" />
                )}
                {t("manualSubmit")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowManual(false)}
                className="w-full"
              >
                {t("cancel") || "Cancel"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function classifyAiError(err: unknown): AiFailureKind {
  const msg = (err as Error)?.message?.toLowerCase() || "";
  if (msg.includes("not ready") || msg.includes("not loaded") || msg.includes("model not")) return "model_not_ready";
  if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
  if (msg.includes("memory") || msg.includes("oom") || msg.includes("out of memory")) return "oom";
  if (msg.includes("image") || msg.includes("process") || msg.includes("format")) return "image_error";
  return "generic";
}
