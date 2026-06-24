import { useState } from "react";
import type { ClinicalScaleResult } from "@/lib/clinical-scales";
import { applyBradenScale, applyLundBrowderChart, type BradenInputs, type BurnInputs } from "@/lib/clinical-scales";
import { AlertTriangle, CheckCircle2, Activity, Thermometer, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const BRADEN_LABELS: Record<keyof BradenInputs, { labelKey: string; optionKeys: { value: number; key: string }[] }> = {
  sensoryPerception: {
    labelKey: "bradenSensoryPerception",
    optionKeys: [
      { value: 1, key: "bradenSensory1" },
      { value: 2, key: "bradenSensory2" },
      { value: 3, key: "bradenSensory3" },
      { value: 4, key: "bradenSensory4" },
    ],
  },
  moisture: {
    labelKey: "bradenMoisture",
    optionKeys: [
      { value: 1, key: "bradenMoisture1" },
      { value: 2, key: "bradenMoisture2" },
      { value: 3, key: "bradenMoisture3" },
      { value: 4, key: "bradenMoisture4" },
    ],
  },
  activity: {
    labelKey: "bradenActivity",
    optionKeys: [
      { value: 1, key: "bradenActivity1" },
      { value: 2, key: "bradenActivity2" },
      { value: 3, key: "bradenActivity3" },
      { value: 4, key: "bradenActivity4" },
    ],
  },
  mobility: {
    labelKey: "bradenMobility",
    optionKeys: [
      { value: 1, key: "bradenMobility1" },
      { value: 2, key: "bradenMobility2" },
      { value: 3, key: "bradenMobility3" },
      { value: 4, key: "bradenMobility4" },
    ],
  },
  nutrition: {
    labelKey: "bradenNutrition",
    optionKeys: [
      { value: 1, key: "bradenNutrition1" },
      { value: 2, key: "bradenNutrition2" },
      { value: 3, key: "bradenNutrition3" },
      { value: 4, key: "bradenNutrition4" },
    ],
  },
  frictionShear: {
    labelKey: "bradenFrictionShear",
    optionKeys: [
      { value: 1, key: "bradenFriction1" },
      { value: 2, key: "bradenFriction2" },
      { value: 3, key: "bradenFriction3" },
    ],
  },
};

interface BradenFormProps {
  onResult: (result: ClinicalScaleResult) => void;
  voice?: {
    active: boolean;
    listening: boolean;
    confirm: (prompt: string) => Promise<boolean>;
  };
}

export function BradenInputForm({ onResult, voice }: BradenFormProps) {
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
            <div className="flex items-center gap-2 mb-1">
              <p className="text-xs text-foreground">{t(config.labelKey as any)}</p>
              {voice?.active && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    const ok = await voice.confirm("Select a rating for this field? Say the number 1 to 4");
                    if (ok) setField(field, 1);
                  }}
                  disabled={voice.listening}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {config.optionKeys.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setField(field, opt.value)}
                  className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    inputs[field] === opt.value
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t(opt.key as any)}
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
  voice?: {
    active: boolean;
    listening: boolean;
    ask: (prompt: string, timeoutMs?: number) => Promise<string | null>;
  };
}

const BURN_FIELDS: { key: keyof Omit<BurnInputs, "depth">; labelKey: string }[] = [
  { key: "percentHead", labelKey: "burnHead" },
  { key: "percentTrunk", labelKey: "burnTrunk" },
  { key: "percentArmLeft", labelKey: "burnArmLeft" },
  { key: "percentArmRight", labelKey: "burnArmRight" },
  { key: "percentLegLeft", labelKey: "burnLegLeft" },
  { key: "percentLegRight", labelKey: "burnLegRight" },
  { key: "percentPerineum", labelKey: "burnPerineum" },
];

export function BurnInputForm({ onResult, voice }: BurnFormProps) {
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
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs text-foreground">{t(f.labelKey as any)} (%)</p>
              {voice?.active && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    const val = await voice.ask("Say the percentage for this body area");
                    if (val) { const num = val.replace(/\D/g, ""); if (num) update({ [f.key]: Math.max(0, Math.min(100, Number(num))) }); }
                  }}
                  disabled={voice.listening}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              )}
            </div>
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
