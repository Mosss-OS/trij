import { useState } from "react";
import type { TriageResult, PossibleCondition } from "@/types/trij";
import { UrgencyPill } from "./UrgencyPill";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";

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

function WhyThisDiagnosis({ features }: { features: string[] }) {
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
  const belowThreshold = result.confidence < minConfidenceForLocalCare;
  const veryLowConfidence = result.confidence < 30;
  const lowConfidence = result.confidence < 50 && !veryLowConfidence;
  const effectiveReferral = belowThreshold || result.referral_advised || veryLowConfidence;

  const borderClass = veryLowConfidence
    ? "border-urgency-red/40"
    : lowConfidence
      ? "border-urgency-yellow/40"
      : "";

  const confidenceLabel =
    result.confidence >= 70
      ? t("confidenceGood")
      : result.confidence >= 50
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
            <h2 className="mt-1 font-display text-2xl font-bold">{result.condition}</h2>
            {result.icd10_code && (
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                ICD-10: {result.icd10_code}
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
              <span className="font-mono font-semibold">{Math.round(result.confidence)}%</span>
            </span>
          </div>
          <Progress
            value={result.confidence}
            className={`h-2 ${
              veryLowConfidence
                ? "[&>div]:bg-urgency-red"
                : lowConfidence
                  ? "[&>div]:bg-urgency-yellow"
                  : "[&>div]:bg-emerald-500"
            }`}
          />
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
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-red" />
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
            topConfidence={result.confidence}
            topCondition={result.condition}
          />
        </div>
      )}

      {result.key_visual_features.length > 0 && (
        <WhyThisDiagnosis features={result.key_visual_features} />
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

      <div className="flex items-start gap-3 rounded-2xl border border-urgency-yellow/20 bg-urgency-yellow/5 p-4 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
        <p>{t("aiDisclaimer")}</p>
      </div>
    </div>
  );
}
