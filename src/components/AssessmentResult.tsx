import type { TriageResult } from "@/types/trij";
import { UrgencyPill } from "./UrgencyPill";
import { Volume2, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Props {
  result: TriageResult;
  onSpeak?: (text: string) => void;
  minConfidenceForLocalCare?: number;
}

export function AssessmentResult({ result, onSpeak, minConfidenceForLocalCare = 70 }: Props) {
  const belowThreshold = result.confidence < minConfidenceForLocalCare;
  const effectiveReferral = belowThreshold || result.referral_advised;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Likely condition
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">{result.condition}</h2>
          </div>
          <UrgencyPill urgency={result.urgency} />
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-mono font-semibold">{Math.round(result.confidence)}%</span>
          </div>
          <Progress value={result.confidence} className="h-2" />
          {belowThreshold && (
            <p className="mt-1.5 text-xs text-urgency-red flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Below {minConfidenceForLocalCare}% threshold — referral recommended
            </p>
          )}
        </div>

        {result.recommendation && (
          <>
            {effectiveReferral && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-urgency-red/30 bg-urgency-red/5 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-red" />
                <div>
                  <p className="text-sm font-medium text-urgency-red">Referral advised</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{result.recommendation}</p>
                </div>
              </div>
            )}
            {!effectiveReferral && (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Treat locally</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">{result.recommendation}</p>
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
            onClick={() =>
              onSpeak(`${result.condition}. ${result.recommendation ?? ""}`)
            }
          >
            <Volume2 className="h-4 w-4" /> Read aloud
          </Button>
        )}
      </div>

      {result.possible_conditions.length > 0 && (
        <div className="rounded-3xl border bg-card p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Differential
          </h3>
          <ul className="mt-3 space-y-2.5">
            {result.possible_conditions.slice(0, 5).map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <span className="flex-1 truncate text-sm">{c.name}</span>
                <span className="text-xs font-mono text-muted-foreground">
                  {Math.round(c.probability)}%
                </span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, c.probability)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.key_visual_features.length > 0 && (
        <div className="rounded-3xl border bg-card p-6">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Key features
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {result.key_visual_features.map((f) => (
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

      <div className="flex items-start gap-3 rounded-2xl border border-urgency-yellow/20 bg-urgency-yellow/5 p-4 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
        <p>
          This is a <strong>preliminary AI-assisted assessment</strong> and does
          not constitute a clinical diagnosis. Always verify with clinical
          judgment and refer when in doubt.
        </p>
      </div>
    </div>
  );
}
