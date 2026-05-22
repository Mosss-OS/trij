import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Thermometer, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  evaluateVitalSigns,
  getNormalRanges,
  getAgeGroup,
  type VitalSignsEvaluation,
} from "@/lib/vital-signs";
import {
  ForeheadMeasurement,
  ArmMeasurement,
  ChestMeasurement,
} from "./PictogramIcons";

type TempUnit = "celsius" | "fahrenheit";

interface VitalSignsInputProps {
  ageYears: number;
  values: {
    systolicBP: string;
    diastolicBP: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    muac: string;
    weight: string;
    painScale: string;
  };
  onChange: (values: VitalSignsInputProps["values"]) => void;
  onContinue: () => void;
  onSkip: () => void;
  disabled?: boolean;
}

function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9 * 10) / 10;
}

function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function VitalSignsInput({
  ageYears,
  values,
  onChange,
  onContinue,
  onSkip,
  disabled,
}: VitalSignsInputProps) {
  const { t } = useI18n();
  const pictogramMode = useSettingsStore((s) => s.pictogramMode);
  const [tempUnit, setTempUnit] = useState<TempUnit>("celsius");
  const ageGroup = getAgeGroup(ageYears);
  const ranges = useMemo(() => getNormalRanges(ageYears), [ageYears]);
  const ageLabel = t(ageGroup);

  const numericVitals = useMemo(() => ({
    temperature: values.temperature ? Number(values.temperature) : undefined,
    respiratoryRate: values.respiratoryRate ? Number(values.respiratoryRate) : undefined,
    heartRate: values.heartRate ? Number(values.heartRate) : undefined,
    systolicBP: values.systolicBP ? Number(values.systolicBP) : undefined,
    diastolicBP: values.diastolicBP ? Number(values.diastolicBP) : undefined,
    oxygenSaturation: values.oxygenSaturation ? Number(values.oxygenSaturation) : undefined,
  }), [values]);

  const evaluation: VitalSignsEvaluation = useMemo(
    () => evaluateVitalSigns(numericVitals, ageYears),
    [numericVitals, ageYears],
  );

  const getFieldClass = (field: string) => {
    const alert = evaluation.alerts.find((a) => a.field === field);
    if (!alert) return "";
    return alert.severity === "critical"
      ? "border-red-500 bg-red-50 focus-visible:ring-red-500"
      : "border-amber-400 bg-amber-50 focus-visible:ring-amber-400";
  };

  const getFieldAlert = (field: string) => {
    return evaluation.alerts.find((a) => a.field === field);
  };

  const handleChange = (field: string, val: string) => {
    onChange({ ...values, [field]: val });
  };

  const criticalCount = evaluation.alerts.filter((a) => a.severity === "critical").length;
  const abnormalCount = evaluation.alerts.length;

  return (
    <div className="mt-7 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("captureVitals")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("vitalsDesc")}
            <span className="ml-1.5 text-xs text-muted-foreground/60">({t("ageGroupLabel")}: {ageLabel})</span>
          </p>
        </div>
      </div>

      {abnormalCount > 0 && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            criticalCount > 0
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-medium">
            {criticalCount > 0
              ? t("vitalSignsCritical")
              : t("vitalSignsAbnormal")}
          </p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {evaluation.alerts.slice(0, 3).map((a, i) => (
              <li key={i}>
                {a.label}: {a.value} — {a.interpretation}
              </li>
            ))}
            {evaluation.alerts.length > 3 && (
              <li className="list-none text-xs text-muted-foreground">
                +{evaluation.alerts.length - 3} more
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label>{t("bp")}</Label>
            {pictogramMode && <ArmMeasurement className="h-5 w-5 text-muted-foreground" />}
          </div>
          <span className="ml-1 text-[10px] text-muted-foreground">{ranges.systolicBP}</span>
          <div className="flex gap-1">
            <Input
              value={values.systolicBP}
              onChange={(e) => handleChange("systolicBP", e.target.value)}
              placeholder="120"
              type="number"
              min={0}
              max={300}
              className={`w-full ${getFieldClass("systolicBP")}`}
              disabled={disabled}
            />
            <span className="flex items-center text-xs text-muted-foreground">/</span>
            <Input
              value={values.diastolicBP}
              onChange={(e) => handleChange("diastolicBP", e.target.value)}
              placeholder="80"
              type="number"
              min={0}
              max={200}
              className={`w-full ${getFieldClass("diastolicBP")}`}
              disabled={disabled}
            />
          </div>
          {getFieldAlert("systolicBP") && (
            <p className="text-[11px] leading-tight text-red-600">
              {getFieldAlert("systolicBP")!.interpretation}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("heartRate")}</Label>
          <span className="ml-1 text-[10px] text-muted-foreground">{ranges.heartRate}</span>
          <Input
            value={values.heartRate}
            onChange={(e) => handleChange("heartRate", e.target.value)}
            placeholder={t("hrPlaceholder")}
            type="number"
            min={0}
            max={300}
            className={getFieldClass("heartRate")}
            disabled={disabled}
          />
          {getFieldAlert("heartRate") && (
            <p className="text-[11px] leading-tight text-red-600">
              {getFieldAlert("heartRate")!.interpretation}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label>{t("respiratoryRate")}</Label>
            {pictogramMode && <ChestMeasurement className="h-5 w-5 text-muted-foreground" />}
          </div>
          <span className="ml-1 text-[10px] text-muted-foreground">{ranges.respiratoryRate}</span>
          <Input
            value={values.respiratoryRate}
            onChange={(e) => handleChange("respiratoryRate", e.target.value)}
            placeholder={t("rrPlaceholder")}
            type="number"
            min={0}
            max={100}
            className={getFieldClass("respiratoryRate")}
            disabled={disabled}
          />
          {getFieldAlert("respiratoryRate") && (
            <p className="text-[11px] leading-tight text-red-600">
              {getFieldAlert("respiratoryRate")!.interpretation}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>{t("temperature")}</Label>
              {pictogramMode && <ForeheadMeasurement className="h-5 w-5 text-muted-foreground" />}
            </div>
            <span className="text-[10px] text-muted-foreground">{ranges.temperature}</span>
          </div>
          <div className="flex gap-1">
            <Input
              value={values.temperature}
              onChange={(e) => handleChange("temperature", e.target.value)}
              placeholder={tempUnit === "celsius" ? t("tempPlaceholder") : "°F"}
              type="number"
              min={30}
              max={45}
              step={0.1}
              className={`flex-1 ${getFieldClass("temperature")}`}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => {
                if (tempUnit === "fahrenheit" && values.temperature) {
                  const c = fahrenheitToCelsius(Number(values.temperature));
                  handleChange("temperature", String(c));
                } else if (tempUnit === "celsius" && values.temperature) {
                  const f = celsiusToFahrenheit(Number(values.temperature));
                  handleChange("temperature", String(f));
                }
                setTempUnit(tempUnit === "celsius" ? "fahrenheit" : "celsius");
              }}
              className="flex items-center gap-1 rounded-lg border px-2 text-xs text-muted-foreground hover:bg-accent disabled:opacity-50"
              disabled={disabled}
            >
              <Thermometer className="h-3 w-3" />
              {tempUnit === "celsius" ? "°C" : "°F"}
            </button>
          </div>
          {getFieldAlert("temperature") && (
            <p className="text-[11px] leading-tight text-red-600">
              {getFieldAlert("temperature")!.interpretation}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("oxygenSaturation")}</Label>
          <span className="ml-1 text-[10px] text-muted-foreground">{ranges.oxygenSaturation}</span>
          <Input
            value={values.oxygenSaturation}
            onChange={(e) => handleChange("oxygenSaturation", e.target.value)}
            placeholder={t("spo2Placeholder")}
            type="number"
            min={0}
            max={100}
            className={getFieldClass("oxygenSaturation")}
            disabled={disabled}
          />
          {getFieldAlert("oxygenSaturation") && (
            <p className="text-[11px] leading-tight text-red-600">
              {getFieldAlert("oxygenSaturation")!.interpretation}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>{t("muac")}</Label>
          <Input
            value={values.muac}
            onChange={(e) => handleChange("muac", e.target.value)}
            placeholder={t("muacPlaceholder")}
            type="number"
            min={0}
            max={60}
            step={0.1}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("weight")}</Label>
          <Input
            value={values.weight}
            onChange={(e) => handleChange("weight", e.target.value)}
            placeholder={t("weightPlaceholder")}
            type="number"
            min={0}
            max={300}
            step={0.1}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t("painScale")}</Label>
          <Input
            value={values.painScale}
            onChange={(e) => handleChange("painScale", e.target.value)}
            placeholder="0-10"
            type="number"
            min={0}
            max={10}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onContinue}
          size="lg"
          className="flex-1 gap-2"
          disabled={disabled}
        >
          {t("continue")} <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          onClick={onSkip}
          size="lg"
          variant="ghost"
          className="gap-2"
          disabled={disabled}
        >
          {t("vitalsUnknown")}
        </Button>
      </div>
    </div>
  );
}
