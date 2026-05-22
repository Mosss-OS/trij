import { useState } from "react";
import type { TriageResult, PossibleCondition } from "@/types/trij";
import { UrgencyPill } from "./UrgencyPill";
import { EducationPanel } from "./EducationPanel";
import { analyzeForAntibiotics } from "@/lib/antibiotic-filter";
import { ClinicalScaleDisplay } from "./ClinicalScaleDisplay";
import { getScaleForCondition, applyWagnerScale, autoAssignWagnerFromCondition } from "@/lib/clinical-scales";
import {
  Volume2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Info,
  BookOpen,
  Beaker,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  FeverIcon,
  WoundIcon,
  BreathingIcon,
  MalnutritionIcon,
  MedicalCross,
  Hospital,
} from "./PictogramIcons";

interface Props {
  result: TriageResult;
  onSpeak?: (text: string) => void;
  minConfidenceForLocalCare?: number;
  engineKind?: "webllm" | "ollama" | "demo" | "cloud" | "auto";
}

const COLORS = [
  "bg-primary",
  "bg-blue-400",
  "bg-amber-400",
  "bg-violet-400",
  "bg-emerald-400",
  "bg-rose-400",
  "bg-cyan-400",
  "bg-orange-400",
];

function getConditionPictogram(condition: string): React.ComponentType<React.SVGProps<SVGSVGElement>> {
  const lowerCondition = condition.toLowerCase();
  
  if (lowerCondition.includes('fever') || lowerCondition.includes('malaria') || lowerCondition.includes('temperature')) {
    return FeverIcon;
  }
  if (lowerCondition.includes('wound') || lowerCondition.includes('injur') || lowerCondition.includes('burn') || lowerCondition.includes('cut')) {
    return WoundIcon;
  }
  if (lowerCondition.includes('breath') || lowerCondition.includes('respirator') || lowerCondition.includes('pneumonia') || lowerCondition.includes('lung')) {
    return BreathingIcon;
  }
  if (lowerCondition.includes('malnutrition') || lowerCondition.includes('underweight') || lowerCondition.includes('wasting')) {
    return MalnutritionIcon;
  }
  
  return MedicalCross; // Default medical icon
}

function StackedBar({
  primary,
  primaryPct,
  differentials,
}: {
  primary: string;
  primaryPct: number;
  differentials: PossibleCondition[];
}) {
  const all = [{ name: primary, probability: primaryPct }, ...differentials];
  const total = all.reduce((s, c) => s + c.probability, 0);
  if (total === 0) return null;

  const segments = all.map((c, i) => ({
    name: c.name,
    pct: Math.max(1, (c.probability / total) * 100),
    color: COLORS[i % COLORS.length],
  }));

  const remaining = segments.reduce((s, seg) => s - seg.pct, 100);
  if (remaining > 0) {
    segments.push({ name: "Other", pct: remaining, color: "bg-muted" });
  }

  return (
    <div
      className="mt-3 flex h-6 w-full overflow-hidden rounded-lg"
      role="img"
      aria-label={`Stacked bar: ${segments.map((s) => `${s.name} ${Math.round(s.pct)}%`).join(", ")}`}
    >
      {segments.map((s, i) => (
        <div
          key={i}
          className={`${s.color} flex items-center justify-center text-[10px] font-semibold text-white transition-all first:rounded-l-lg last:rounded-r-lg`}
          style={{ width: `${s.pct}%`, minWidth: s.pct > 8 ? undefined : 0 }}
          title={`${s.name}: ${Math.round(s.pct)}%`}
        >
          {s.pct > 8 ? `${Math.round(s.pct)}%` : null}
        </div>
      ))}
    </div>
  );
}

function DifferentialList({
  differentials,
  topConfidence,
  topCondition,
}: {
  differentials: PossibleCondition[];
  topConfidence: number;
  topCondition: string;
}) {
  const { t } = useI18n();
  const [showLow, setShowLow] = useState(false);

  const sorted = [...differentials].sort((a, b) => b.probability - a.probability);
  const main = sorted.filter((c) => c.probability >= 10);
  const low = sorted.filter((c) => c.probability < 10);

  const gap = sorted.length > 0 ? topConfidence - sorted[0].probability : 100;
  const closeDifferential = sorted.length > 0 && gap < 15;
  const limitedDifferential = sorted.length < 3;

  return (
    <div className="space-y-3">
      <StackedBar primary={topCondition} primaryPct={topConfidence} differentials={sorted} />

      {closeDifferential && (
        <div className="flex items-start gap-2 rounded-xl border border-urgency-yellow/30 bg-urgency-yellow/5 px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
          <p className="text-xs text-urgency-yellow">{t("closeDifferentialWarning")}</p>
        </div>
      )}

      {limitedDifferential && (
        <p className="text-xs italic text-muted-foreground">{t("limitedDifferentialNote")}</p>
      )}

      <ul className="space-y-2">
        {main.map((c, i) => (
          <li key={c.name} className="flex items-center gap-3">
            <span className="flex-1 truncate text-sm">{c.name}</span>
            <span className="text-xs font-mono text-muted-foreground">
              {Math.round(c.probability)}%
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`}
                style={{ width: `${Math.min(100, c.probability)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {low.length > 0 && (
        <div>
          <button
            onClick={() => setShowLow(!showLow)}
            className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground"
            aria-expanded={showLow}
          >
            <span>
              {t("lowProbability")} ({low.length})
            </span>
            {showLow ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showLow && (
            <ul className="mt-2 space-y-2 pl-2">
              {low.map((c) => (
                <li key={c.name} className="flex items-center gap-3 opacity-60">
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">&lt;10%</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-muted-foreground/20"
                      style={{ width: `${c.probability}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function DifferentialDiagnosisView({
  dd,
}: {
  dd: NonNullable<TriageResult["differential_diagnosis"]>;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{t("primaryDiagnosis")}</p>
            <p className="mt-1 text-base font-bold">{dd.primary_diagnosis.name}</p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-muted-foreground">{t("confidence")}</p>
            <p className="text-lg font-bold">{Math.round(dd.primary_diagnosis.confidence)}%</p>
          </div>
        </div>
        {dd.primary_diagnosis.supporting_features.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <ThumbsUp className="h-3 w-3" /> {t("supporting")}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {dd.primary_diagnosis.supporting_features.map((f) => (
                <li
                  key={f}
                  className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        {dd.primary_diagnosis.against_features.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600">
              <ThumbsDown className="h-3 w-3" /> {t("against")}
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {dd.primary_diagnosis.against_features.map((f) => (
                <li
                  key={f}
                  className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("alternatives")}
        </p>
        {(showAll ? dd.differentials : dd.differentials.slice(0, 2)).map((d) => (
          <div key={d.name} className="rounded-xl border bg-card/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{d.name}</p>
              </div>
              <span className="flex-shrink-0 font-mono text-xs text-muted-foreground">
                {Math.round(d.confidence)}%
              </span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary/50"
                style={{ width: `${Math.min(100, d.confidence)}%` }}
              />
            </div>
            {d.distinguishing_questions.length > 0 && (
              <div className="mt-2">
                <p className="mb-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <HelpCircle className="h-3 w-3" /> {t("distinguishingQuestions")}
                </p>
                <ul className="space-y-0.5">
                  {d.distinguishing_questions.map((q) => (
                    <li key={q} className="text-xs italic text-muted-foreground">
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {dd.differentials.length > 2 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed py-2 text-xs text-muted-foreground hover:bg-accent"
          >
            <ChevronDown className="h-3 w-3" />
            {t("showAllN").replace("{n}", String(dd.differentials.length - 2))}
          </button>
        )}
      </div>
    </div>
  );
}

function WhyThisDiagnosis({
  features,
  supporting,
  against,
}: {
  features: string[];
  supporting?: string[];
  against?: string[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border bg-card/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
        aria-expanded={open}
      >
        <span>{t("whyThisDiagnosis")}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">{t("keyFeatures")}:</p>
          <ul className="flex flex-wrap gap-2">
            {features.map((f) => (
              <li
                key={f}
                className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground"
              >
                {f}
              </li>
            ))}
          </ul>
          {supporting && supporting.length > 0 && (
            <>
              <p className="mb-2 mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <ThumbsUp className="h-3 w-3" /> {t("supportingFeatures")}
              </p>
              <ul className="flex flex-wrap gap-2">
                {supporting.map((f) => (
                  <li
                    key={f}
                    className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}
          {against && against.length > 0 && (
            <>
              <p className="mb-2 mt-3 flex items-center gap-1 text-xs font-medium text-amber-600">
                <ThumbsDown className="h-3 w-3" /> {t("againstFeatures")}
              </p>
              <ul className="flex flex-wrap gap-2">
                {against.map((f) => (
                  <li
                    key={f}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function AssessmentResult({
  result,
  onSpeak,
  minConfidenceForLocalCare = 70,
  engineKind,
}: Props) {
  const { t } = useI18n();
  const pictogramMode = useSettingsStore((s) => s.pictogramMode);
  const confidencePoint = result.confidence.confidence_point;
  const belowThreshold = confidencePoint < minConfidenceForLocalCare;
  const veryLowConfidence = confidencePoint < 30;
  const lowConfidence = confidencePoint < 50 && !veryLowConfidence;
  const effectiveReferral = belowThreshold || result.referral_advised || veryLowConfidence;

  const borderClass = veryLowConfidence
    ? "border-urgency-red/40"
    : lowConfidence
      ? "border-urgency-yellow/40"
      : "";

  const confidenceLabel =
    confidencePoint >= 70
      ? t("confidenceGood")
      : confidencePoint >= 50
        ? t("confidenceModerate")
        : t("confidenceLow");

  return (
    <div className="space-y-5">
      <div className={`rounded-3xl border bg-card p-6 shadow-sm ${borderClass}`}>
        {veryLowConfidence && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-urgency-red/30 bg-urgency-red/10 px-3 py-2 text-xs font-medium text-urgency-red">
            <ShieldAlert className="h-4 w-4" />
            {t("veryLowConfidenceWarning")}
          </div>
        )}
        {lowConfidence && !veryLowConfidence && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-urgency-yellow/30 bg-urgency-yellow/10 px-3 py-2 text-xs font-medium text-urgency-yellow">
            <AlertTriangle className="h-4 w-4" />
            {t("lowConfidenceWarning")}
          </div>
        )}
        {engineKind === "demo" && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Beaker className="h-4 w-4" />
            {t("demoMode")}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("likelyCondition")}
            </p>
            <div className="mt-1 flex items-center gap-2">
              {pictogramMode && (
                <div className="flex-shrink-0">
                  {(() => {
                    const ConditionIcon = getConditionPictogram(result.condition);
                    return <ConditionIcon className="h-8 w-8" />;
                  })()}
                </div>
              )}
              <h2 className="font-display text-2xl font-bold">{result.condition}</h2>
            </div>
            {result.icd10_code && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                ICD-10: {result.icd10_code}
              </p>
            )}
            {result.presentation_type && result.presentation_type !== "dermatology" && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("presentationType")}: {result.presentation_type}
              </p>
            )}
            {result.description && (
              <p className="mt-0.5 text-xs italic text-muted-foreground">
                "{result.description}"
              </p>
            )}
          </div>
          <UrgencyPill urgency={result.urgency} />
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">{t("confidence")}</span>
            <span className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  veryLowConfidence
                    ? "text-urgency-red"
                    : lowConfidence
                      ? "text-urgency-yellow"
                      : "text-emerald-600"
                }`}
              >
                {confidenceLabel}
              </span>
              <span className="font-mono font-semibold">{Math.round(confidencePoint)}%</span>
            </span>
          </div>
          <Progress
            value={confidencePoint}
            className={`h-2 ${
              veryLowConfidence
                ? "[&>div]:bg-urgency-red"
                : lowConfidence
                  ? "[&>div]:bg-urgency-yellow"
                  : "[&>div]:bg-emerald-500"
            }`}
          />
          
          {/* Uncertainty Quantification Display */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Range (95% CI)</span>
              <span className="font-mono text-xs">
                {Math.round(result.confidence.confidence_interval[0])}% - {Math.round(result.confidence.confidence_interval[1])}%
              </span>
            </div>
            
            {/* Visual indicator for uncertainty level based on interval width */}
            <div className="flex items-center gap-2 text-xs">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div 
                  className={`h-full transition-all ${
                    (result.confidence.confidence_interval[1] - result.confidence.confidence_interval[0]) > 30 
                      ? "bg-urgency-red" 
                      : (result.confidence.confidence_interval[1] - result.confidence.confidence_interval[0]) > 15 
                        ? "bg-urgency-yellow" 
                        : "bg-emerald-500"
                  }`}
                  style={{ 
                    width: `${((result.confidence.confidence_interval[1] - result.confidence.confidence_interval[0]) / 100) * 100}%`,
                    marginLeft: `${result.confidence.confidence_interval[0]}%`
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {(result.confidence.confidence_interval[1] - result.confidence.confidence_interval[0]) > 30 
                  ? "High Uncertainty" 
                  : (result.confidence.confidence_interval[1] - result.confidence.confidence_interval[0]) > 15 
                    ? "Moderate Uncertainty" 
                    : "Low Uncertainty"}
              </span>
            </div>
            
            {result.confidence.uncertainty_reason && (
              <div className={`rounded-lg p-2 ${
                result.confidence.uncertainty_source === "both" 
                  ? "bg-urgency-red/10 border border-urgency-red/20" 
                  : result.confidence.uncertainty_source === "image_quality" 
                    ? "bg-urgency-yellow/10 border border-urgency-yellow/20" 
                    : "bg-emerald-500/10 border border-emerald-500/20"
              }`}>
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>Uncertainty Factor: {
                    result.confidence.uncertainty_source === "image_quality" 
                      ? "Image Quality" 
                      : result.confidence.uncertainty_source === "model_knowledge" 
                        ? "Model Knowledge" 
                        : "Multiple Factors"
                  }</span>
                </div>
                <p className="text-xs text-muted-foreground/80">
                  {result.confidence.uncertainty_reason}
                </p>
              </div>
            )}
          </div>

          {belowThreshold && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-urgency-red">
              <AlertTriangle className="h-3 w-3" />
              {t("belowThreshold").replace("{pct}", String(minConfidenceForLocalCare))}
            </p>
          )}
        </div>

        {result.recommendation && (
          <>
            {effectiveReferral && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-urgency-red/30 bg-urgency-red/5 p-4">
                {pictogramMode ? (
                  <Hospital className="mt-0.5 h-6 w-6 flex-shrink-0 text-urgency-red" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-red" />
                )}
                <div>
                  <p className="text-sm font-medium text-urgency-red">{t("referralAdvised")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            )}
            {!effectiveReferral && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">{t("treatLocally")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {result.recommendation}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {result.clinical_scale && (
          <div className="mt-4">
            <ClinicalScaleDisplay scale={result.clinical_scale} scaleId={result.clinical_scale.scaleId} />
          </div>
        )}

        {result.recommendation && analyzeForAntibiotics(
          result.condition,
          result.recommendation,
          result.possible_conditions,
        ).hasAntibioticMention && (
          <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-700">{t("amrWarning")}</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800/80">
                {t("amrWarningDesc")}
              </p>
            </div>
          </div>
        )}

        {onSpeak && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => onSpeak(`${result.condition}. ${result.recommendation ?? ""}`)}
          >
            <Volume2 className="h-4 w-4" /> {t("readAloud")}
          </Button>
        )}
      </div>

      {result.possible_conditions.length > 0 && (
        <div className="rounded-3xl border bg-card p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("differential")}
          </h3>
          <DifferentialList
            differentials={result.possible_conditions}
            topConfidence={confidencePoint}
            topCondition={result.condition}
          />
        </div>
      )}

      {result.differential_diagnosis && (
        <div className="rounded-3xl border bg-card p-6">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t("structuredDifferential")}
          </h3>
          <DifferentialDiagnosisView dd={result.differential_diagnosis} />
        </div>
      )}

      {result.key_visual_features.length > 0 && (
        <WhyThisDiagnosis
          features={result.key_visual_features}
          supporting={result.differential_diagnosis?.primary_diagnosis.supporting_features}
          against={result.differential_diagnosis?.primary_diagnosis.against_features}
        />
      )}

      {result.rag_sources && result.rag_sources.length > 0 && (
        <div className="rounded-3xl border bg-card p-6">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">{t("sources")}</h3>
          </div>
          <ul className="space-y-3">
            {result.rag_sources.slice(0, 4).map((s, i) => (
              <li key={i} className="rounded-xl bg-secondary/20 p-3">
                <p className="text-sm font-medium">{s.condition}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.treatment}</p>
                {s.who_guideline && (
                  <p className="mt-1 text-[11px] italic text-muted-foreground/70">
                    {s.who_guideline}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <EducationPanel condition={result.condition} />

      <div className="flex items-start gap-3 rounded-2xl border border-urgency-yellow/20 bg-urgency-yellow/5 p-4 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
        <p>{t("aiDisclaimer")}</p>
      </div>
    </div>
  );
}
