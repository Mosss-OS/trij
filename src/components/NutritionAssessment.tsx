import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { assessNutrition, getClassificationLabel, getClassificationColor, getOedemaLabel, type NutritionAssessmentResult } from "@/lib/nutrition";
import { calculateWHOScores, getZScoreLabel, getZScoreColor, type ZScoreResult, BOYS_WFA, GIRLS_WFA, BOYS_HFA, GIRLS_HFA } from "@/lib/who-standards";
import { AlertTriangle, CheckCircle2, ChevronRight, Ruler, Droplets, Eye, Scale, Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { WHOGrowthChart } from "./WHO GrowthChart";

interface Props {
  ageYears: number;
  sex?: "male" | "female";
  onComplete: (result: NutritionAssessmentResult) => void;
  onSkip: () => void;
}

export function NutritionAssessment({ ageYears, sex, onComplete, onSkip }: Props) {
  const { t } = useI18n();
  const [muacCm, setMuacCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [oedema, setOedema] = useState<NutritionAssessmentResult["oedema"]>("none");
  const [visibleWasting, setVisibleWasting] = useState(false);
  const [hairChanges, setHairChanges] = useState(false);
  const [skinChanges, setSkinChanges] = useState(false);

  const result = useMemo<NutritionAssessmentResult | null>(() => {
    const val = parseFloat(muacCm);
    if (isNaN(val) || val <= 0) return null;
    
    const muacResult = assessNutrition(val, ageYears, oedema, visibleWasting, hairChanges, skinChanges);
    
    // Combine with WHO Z-score classification if available
    if (zScoreResult) {
      // WHO classification takes precedence for SAM/MAM determination
      // as it's more specific for acute malnutrition
      const whoClassification = zScoreResult.classification;
      
      // If WHO indicates SAM or MAM, use that classification
      if (whoClassification === "sam" || whoClassification === "mam") {
        return {
          ...muacResult,
          classification: whoClassification,
          samTriggered: whoClassification === "sam" || oedema !== "none",
          urgency: whoClassification === "sam" ? "red" : "yellow",
        };
      }
    }
    
    return muacResult;
  }, [muacCm, ageYears, oedema, visibleWasting, hairChanges, skinChanges, zScoreResult]);

  const zScoreResult = useMemo<ZScoreResult | null>(() => {
    const weight = parseFloat(weightKg);
    const height = parseFloat(heightCm);
    const ageMonths = ageYears * 12;
    
    if (!sex || isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0 || ageMonths < 0 || ageMonths > 60) {
      return null;
    }
    
    return calculateWHOScores(weight, height, ageMonths, sex);
  }, [weightKg, heightCm, ageYears, sex]);

  const isChild = ageYears < 18;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-display text-base font-semibold">{t("nutritionAssessment")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {isChild ? t("nutritionChildPrompt") : t("nutritionAdultPrompt")}
        </p>

        <div className="mt-4 space-y-4">
          {isChild && (
            <>
              <div>
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Scale className="h-4 w-4 text-primary" />
                  {t("weightForAge")}
                </Label>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {t("whoZScoreDescription")}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={50}
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 12.5"
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Activity className="h-4 w-4 text-primary" />
                  {t("heightForAge")}
                </Label>
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {t("whoZScoreDescription")}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={150}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 85.5"
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">cm</span>
                </div>
              </div>
            </>
          )}

          <div>
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Ruler className="h-4 w-4 text-primary" />
              {t("muacLabel")}
            </Label>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("muacGuide")}</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min={0}
                max={50}
                value={muacCm}
                onChange={(e) => setMuacCm(e.target.value)}
                placeholder={isChild ? t("muacChildPlaceholder") : t("muacAdultPlaceholder")}
                className="w-32"
              />
              <span className="text-xs text-muted-foreground">cm</span>
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Droplets className="h-4 w-4 text-primary" />
              {t("oedemaLabel")}
            </Label>
            <p className="mb-1.5 text-xs text-muted-foreground">{t("oedemaGuide")}</p>
            <div className="flex flex-wrap gap-1.5">
              {(["none", "bilateral_mild", "bilateral_moderate", "bilateral_severe"] as const).map((o) => (
                <button
                  key={o}
                  onClick={() => setOedema(o)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    oedema === o
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {getOedemaLabel(o)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <Eye className="h-4 w-4 text-primary" />
              {t("visualIndicators")}
            </Label>
            <p className="mb-2 text-xs text-muted-foreground">{t("visualIndicatorsGuide")}</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 rounded-lg border bg-card/30 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={visibleWasting}
                  onChange={(e) => setVisibleWasting(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {t("visibleWasting")}
              </label>
              <label className="flex items-center gap-2 rounded-lg border bg-card/30 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={hairChanges}
                  onChange={(e) => setHairChanges(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {t("hairChanges")}
              </label>
              <label className="flex items-center gap-2 rounded-lg border bg-card/30 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={skinChanges}
                  onChange={(e) => setSkinChanges(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {t("skinChanges")}
              </label>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className={`rounded-2xl border p-5 ${getClassificationColor(result.classification)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("nutritionStatus")}
              </p>
              <p className="mt-1 font-display text-lg font-bold">
                {getClassificationLabel(result.classification)}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{t("muac")}</p>
              <p className="text-xl font-bold">{result.muacCm} cm</p>
            </div>
          </div>

          {result.oedema !== "none" && (
            <div className="mt-3 flex items-center gap-2 text-xs">
              <Droplets className="h-3 w-3" />
              <span className="font-medium">{t("oedemaDetected")}:</span>
              <span>{getOedemaLabel(result.oedema)}</span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {result.visibleWasting && (
              <span className="rounded-full bg-card/50 px-2.5 py-0.5">{t("visibleWasting")}</span>
            )}
            {result.hairChanges && (
              <span className="rounded-full bg-card/50 px-2.5 py-0.5">{t("hairChanges")}</span>
            )}
            {result.skinChanges && (
              <span className="rounded-full bg-card/50 px-2.5 py-0.5">{t("skinChanges")}</span>
            )}
          </div>

          {result.samTriggered && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-urgency-red/30 bg-urgency-red/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-red" />
              <div>
                <p className="text-sm font-medium text-urgency-red">{t("samDetected")}</p>
                <p className="mt-1 text-xs text-urgency-red/80">{t("samGuidance")}</p>
              </div>
            </div>
          )}

          {!result.samTriggered && result.classification === "mam" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-urgency-yellow/30 bg-urgency-yellow/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
              <div>
                <p className="text-sm font-medium text-urgency-yellow">{t("mamDetected")}</p>
                <p className="mt-1 text-xs text-urgency-yellow/80">{t("mamGuidance")}</p>
              </div>
            </div>
          )}

          {result.classification === "normal" && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {t("nutritionNormal")}
            </div>
          )}
        </div>
      )}

      {zScoreResult && sex && (
        <>
          <div className="rounded-2xl border bg-card p-5">
            <h4 className="mb-3 font-display text-sm font-semibold">{t("whoGrowthStandards")}</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("weightForAge")}</span>
                <span className={`font-mono font-semibold ${getZScoreColor(zScoreResult.waz)}`}>
                  {zScoreResult.waz.toFixed(2)} ({getZScoreLabel(zScoreResult.waz)})
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("heightForAge")}</span>
                <span className={`font-mono font-semibold ${getZScoreColor(zScoreResult.haz)}`}>
                  {zScoreResult.haz.toFixed(2)} ({getZScoreLabel(zScoreResult.haz)})
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("weightForHeight")}</span>
                <span className={`font-mono font-semibold ${getZScoreColor(zScoreResult.whz)}`}>
                  {zScoreResult.whz.toFixed(2)} ({getZScoreLabel(zScoreResult.whz)})
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("bmiForAge")}</span>
                <span className={`font-mono font-semibold ${getZScoreColor(zScoreResult.bmiForAge)}`}>
                  {zScoreResult.bmiForAge.toFixed(2)} ({getZScoreLabel(zScoreResult.bmiForAge)})
                </span>
              </div>
            </div>

            {zScoreResult.classification === "sam" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-urgency-red/30 bg-urgency-red/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-red" />
                <div>
                  <p className="text-sm font-medium text-urgency-red">{t("whoSAM")}</p>
                  <p className="mt-1 text-xs text-urgency-red/80">{t("whoSAMGuidance")}</p>
                </div>
              </div>
            )}

            {zScoreResult.classification === "mam" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-urgency-yellow/30 bg-urgency-yellow/10 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-urgency-yellow" />
                <div>
                  <p className="text-sm font-medium text-urgency-yellow">{t("whoMAM")}</p>
                  <p className="mt-1 text-xs text-urgency-yellow/80">{t("whoMAMGuidance")}</p>
                </div>
              </div>
            )}
          </div>

          {/* Growth Charts */}
          <div className="space-y-4">
            <WHOGrowthChart
              standards={sex === "male" ? BOYS_WFA : GIRLS_WFA}
              value={parseFloat(weightKg)}
              valueType="weight"
              ageMonths={ageYears * 12}
              title="Weight-for-Age Growth Chart"
            />
            
            <WHOGrowthChart
              standards={sex === "male" ? BOYS_HFA : GIRLS_HFA}
              value={parseFloat(heightCm)}
              valueType="height"
              ageMonths={ageYears * 12}
              title="Height-for-Age Growth Chart"
            />
          </div>
        </>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => result && onComplete(result)}
          disabled={!result}
          size="sm"
          className="gap-1.5"
        >
          {t("continue")}
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button onClick={onSkip} variant="ghost" size="sm">
          {t("skip")}
        </Button>
      </div>
    </div>
  );
}
