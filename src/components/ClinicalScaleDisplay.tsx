import { useState } from "react";
import type { ClinicalScaleResult } from "@/lib/clinical-scales";
import { applyBradenScale, applyLundBrowderChart, type BradenInputs, type BurnInputs } from "@/lib/clinical-scales";
import { AlertTriangle, CheckCircle2, Activity, Thermometer } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  scale: ClinicalScaleResult;
  scaleId: string;
}

const SCALE_ICONS: Record<string, React.ElementType> = {
  wagner: AlertTriangle,
  braden: Activity,
  "lund-browder": Thermometer,
};

export function ClinicalScaleDisplay({ scale, scaleId }: Props) {
  const { t } = useI18n();
  const Icon = SCALE_ICONS[scaleId] ?? AlertTriangle;

  const isSevere = scale.score / scale.maxScore > 0.6;
  const isModerate = scale.score / scale.maxScore > 0.3;

  return (
    <div className={`rounded-2xl border p-4 ${
      isSevere
        ? "border-urgency-red/30 bg-urgency-red/5"
        : isModerate
          ? "border-urgency-yellow/30 bg-urgency-yellow/5"
          : "border-emerald-500/20 bg-emerald-50/50"
    }`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${
          isSevere ? "text-urgency-red" : isModerate ? "text-urgency-yellow" : "text-emerald-600"
        }`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{scale.scaleName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("score")}: {scale.score}/{scale.maxScore} &middot; {scale.grade}
          </p>
          <p className="mt-2 text-sm leading-relaxed">{scale.interpretation}</p>
          <div className="mt-3 rounded-xl bg-card/50 p-3">
            <p className="flex items-center gap-1 text-xs font-medium text-foreground">
              <CheckCircle2 className="h-3 w-3" />
              {t("management")}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {scale.managementGuidance}
            </p>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground/60">
            {t("source")}: {scale.source}
          </p>
        </div>
      </div>
    </div>
  );
}

const BRADEN_LABELS: Record<keyof BradenInputs, { label: string; options: { value: number; text: string }[] }> = {
  sensoryPerception: {
    label: "Sensory perception",
    options: [
      { value: 1, text: "Completely limited" },
      { value: 2, text: "Very limited" },
      { value: 3, text: "Slightly limited" },
      { value: 4, text: "No impairment" },
    ],
  },
  moisture: {
    label: "Moisture exposure",
    options: [
      { value: 1, text: "Constantly moist" },
      { value: 2, text: "Very moist" },
      { value: 3, text: "Occasionally moist" },
      { value: 4, text: "Rarely moist" },
    ],
  },
  activity: {
    label: "Activity level",
    options: [
      { value: 1, text: "Bedfast" },
      { value: 2, text: "Chairfast" },
      { value: 3, text: "Walks occasionally" },
      { value: 4, text: "Walks frequently" },
    ],
  },
  mobility: {
    label: "Mobility",
    options: [
      { value: 1, text: "Completely immobile" },
      { value: 2, text: "Very limited" },
      { value: 3, text: "Slightly limited" },
      { value: 4, text: "No limitation" },
    ],
  },
  nutrition: {
    label: "Nutrition",
    options: [
      { value: 1, text: "Very poor" },
      { value: 2, text: "Probably inadequate" },
      { value: 3, text: "Adequate" },
      { value: 4, text: "Excellent" },
    ],
  },
  frictionShear: {
    label: "Friction & shear",
    options: [
      { value: 1, text: "Significant problem" },
      { value: 2, text: "Potential problem" },
      { value: 3, text: "No apparent problem" },
    ],
  },
};

interface BradenFormProps {
  onResult: (result: ClinicalScaleResult) => void;
}

export function BradenInputForm({ onResult }: BradenFormProps) {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<BradenInputs>({
    sensoryPerception: 4,
    moisture: 4,
    activity: 4,
    mobility: 4,
    nutrition: 4,
    frictionShear: 3,
  });

  const setField = (field: keyof BradenInputs, value: number) => {
    const updated = { ...inputs, [field]: value as 1 | 2 | 3 | 4 };
    setInputs(updated);
    onResult(applyBradenScale(updated));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{t("bradenInputPrompt")}</p>
      {(Object.keys(BRADEN_LABELS) as Array<keyof BradenInputs>).map((field) => {
        const config = BRADEN_LABELS[field];
        return (
          <div key={field}>
            <p className="mb-1 text-xs text-foreground">{config.label}</p>
            <div className="flex flex-wrap gap-1">
              {config.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setField(field, opt.value)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    inputs[field] === opt.value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface BurnFormProps {
  onResult: (result: ClinicalScaleResult) => void;
}

const BURN_FIELDS: { key: keyof Omit<BurnInputs, "depth">; label: string }[] = [
  { key: "percentHead", label: "Head" },
  { key: "percentTrunk", label: "Trunk (front + back)" },
  { key: "percentArmLeft", label: "Left arm" },
  { key: "percentArmRight", label: "Right arm" },
  { key: "percentLegLeft", label: "Left leg" },
  { key: "percentLegRight", label: "Right leg" },
  { key: "percentPerineum", label: "Perineum" },
];

export function BurnInputForm({ onResult }: BurnFormProps) {
  const { t } = useI18n();
  const [inputs, setInputs] = useState<BurnInputs>({
    percentHead: 0, percentTrunk: 0, percentArmLeft: 0, percentArmRight: 0,
    percentLegLeft: 0, percentLegRight: 0, percentPerineum: 0,
    depth: "superficial",
  });

  const update = (partial: Partial<BurnInputs>) => {
    const updated = { ...inputs, ...partial };
    setInputs(updated);
    onResult(applyLundBrowderChart(updated));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{t("burnInputPrompt")}</p>
      <div className="grid grid-cols-2 gap-2">
        {BURN_FIELDS.map((f) => (
          <div key={f.key}>
            <p className="mb-0.5 text-xs text-foreground">{f.label} (%)</p>
            <input
              type="number"
              min={0}
              max={100}
              value={inputs[f.key]}
              onChange={(e) => update({ [f.key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
            />
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1 text-xs text-foreground">{t("burnDepth")}</p>
        <div className="flex gap-1">
          {(["superficial", "partial", "full"] as const).map((d) => (
            <button
              key={d}
              onClick={() => update({ depth: d })}
              className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                inputs.depth === d
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {d === "superficial" ? t("superficial") : d === "partial" ? t("partialThickness") : t("fullThickness")}
            </button>
          ))}
        </div>
      </div>
      {inputs.percentHead + inputs.percentTrunk + inputs.percentArmLeft +
        inputs.percentArmRight + inputs.percentLegLeft + inputs.percentLegRight +
        inputs.percentPerineum > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("totalBsa")}: {Math.min(100,
            inputs.percentHead + inputs.percentTrunk + inputs.percentArmLeft +
            inputs.percentArmRight + inputs.percentLegLeft + inputs.percentLegRight +
            inputs.percentPerineum)}%
        </p>
      )}
    </div>
  );
}
