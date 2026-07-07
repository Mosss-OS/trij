import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { patientSymptomTriage } from "@/lib/gemma";
import { LANGUAGES } from "@/lib/voice";
import type { TriageResult } from "@/types/trij";
import {
  Heart,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Stethoscope,
  Pill,
  Home,
  MapPin,
  User,
  Users,
  Baby,
  GraduationCap,
  Clock,
  Activity,
  QrCode,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/patient")({
  component: PatientPortalPage,
  head: () => ({
    meta: [{ title: "Patient Portal" }],
  }),
});

type Step =
  | "landing"
  | "step-1"
  | "step-2"
  | "step-3"
  | "step-4"
  | "step-5"
  | "result";

const CHIP_SYMPTOMS = [
  "Fever",
  "Cough",
  "Headache",
  "Sore throat",
  "Stomach ache",
  "Diarrhoea",
  "Rash",
  "Body ache",
  "Vomiting",
  "Dizziness",
  "Chest pain",
  "Difficulty breathing",
  "Ear pain",
  "Eye irritation",
  "Joint pain",
  "Fatigue",
];

function PatientPortalPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();

  const AGE_RANGES = [
    { value: "0-2", label: t("ageRangeBaby"), icon: Baby },
    { value: "3-12", label: t("ageRangeChild"), icon: GraduationCap },
    { value: "13-17", label: t("ageRangeTeen"), icon: User },
    { value: "18-60", label: t("ageRangeAdult"), icon: User },
    { value: "60+", label: t("ageRangeElder"), icon: Users },
  ];

  const DURATIONS = [
    { value: "just-started", label: t("durationJustStarted") },
    { value: "1-2-days", label: t("duration1to2Days") },
    { value: "3-7-days", label: t("duration3to7Days") },
    { value: "more-than-week", label: t("durationMoreThanWeek") },
  ];

  const [step, setStep] = useState<Step>("landing");
  const [stepIndex, setStepIndex] = useState(1);
  const [whoFor, setWhoFor] = useState<"self" | "someone-else" | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState<string | null>(null);
  const [additionalSymptoms, setAdditionalSymptoms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const goToStep = (s: Step, idx?: number) => {
    setStep(s);
    if (idx) setStepIndex(idx);
    window.scrollTo(0, 0);
  };

  const handleStartTriage = () => goToStep("step-1", 1);
  const handleBack = () => {
    if (step === "step-1") goToStep("landing");
    else if (step === "step-2") goToStep("step-1", 1);
    else if (step === "step-3") goToStep("step-2", 2);
    else if (step === "step-4") goToStep("step-3", 3);
    else if (step === "step-5") goToStep("step-4", 4);
    else if (step === "result") goToStep("landing");
  };

  const toggleChip = (symptom: string) => {
    setAdditionalSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom],
    );
  };

  const getFullDescription = () => {
    const parts = [symptoms];
    if (additionalSymptoms.length > 0) {
      parts.push(t("alsoExperiencing") + " " + additionalSymptoms.join(", "));
    }
    const whoDesc =
      whoFor === "someone-else" ? " " + t("forDependent") : " " + t("forMyself");
    return parts.join(". ") + whoDesc;
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) return;
    setLoading(true);
    try {
      const res = await patientSymptomTriage(
        getFullDescription(),
        ageRange || "18-60",
        duration || "just-started",
        language,
      );
      setResult(res);
      goToStep("result");
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (u: string) => {
    switch (u) {
      case "red": return "bg-red-500 border-red-700 text-white";
      case "yellow": return "bg-amber-500 border-amber-700 text-white";
      case "green": return "bg-green-500 border-green-700 text-white";
      default: return "bg-gray-500 border-gray-700 text-white";
    }
  };

  const getUrgencyIcon = (u: string) => {
    switch (u) {
      case "red": return AlertTriangle;
      case "yellow": return Stethoscope;
      case "green": return Home;
      default: return Activity;
    }
  };

  const openGoogleMaps = () => {
    window.open("https://maps.google.com/?q=hospital+near+me", "_blank");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-600" />
          <p className="mt-4 text-lg font-medium text-amber-800">
            {t("analyzingSymptoms")}
          </p>
          <p className="mt-2 text-sm text-amber-600">
            {t("moment")}
          </p>
        </div>
      </div>
    );
  }

  if (step === "landing") {
    const hour = new Date().getHours();
    const greeting =
      hour < 12
        ? t("goodMorning")
        : hour < 18
          ? t("goodAfternoon")
          : t("goodEvening");

    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50 to-white">
        <div className="flex-1 px-6 pt-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <Heart className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-3xl font-bold text-amber-900">
                {greeting}
              </h1>
              <p className="mt-2 text-lg text-amber-700">
                {t("appTagline")}
              </p>
            </div>

            <Button
              onClick={handleStartTriage}
              className="mb-3 h-16 w-full rounded-2xl bg-amber-600 text-lg font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-700"
            >
              <Heart className="mr-2 h-6 w-6" />
              {t("triageStart")}
            </Button>

            <Button
              onClick={() => navigate({ to: "/patient/scan" })}
              variant="outline"
              className="mb-6 h-14 w-full rounded-2xl border-amber-300 text-base font-bold text-amber-700 hover:bg-amber-100"
            >
              <QrCode className="mr-2 h-5 w-5" />
              {t("qrScanTitle")}
            </Button>

            <div className="mb-8 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-amber-800">
                {t("interfaceAndSpeech")}
              </label>
              <select
                value={language}
                onChange={(e) =>
                  useSettingsStore.getState().setLanguage(e.target.value)
                }
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-700">
              <p className="font-medium">
                🔒 {t("privacy")}
              </p>
              <p className="mt-1">
                {t("privacyDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 text-center">
          <Button
            variant="ghost"
            className="text-amber-600"
            onClick={() => navigate({ to: "/triage" })}
          >
            {t("backToPatients")}
          </Button>
        </div>
      </div>
    );
  }

  if (step === "result" && result) {
    const UrgencyIcon = getUrgencyIcon(result.urgency);

    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
        <AppHeader title={t("assessmentResult")} />

        <div className="mx-auto max-w-md px-4 py-6">
          <div
            className={cn(
              "mb-6 rounded-3xl border-2 p-6 text-center shadow-lg",
              getUrgencyColor(result.urgency),
            )}
          >
            <UrgencyIcon className="mx-auto mb-3 h-16 w-16" />
            <h2 className="text-2xl font-bold">
              {result.urgency === "red"
                ? t("triageResultEmergency")
                : result.urgency === "yellow"
                  ? t("triageResultClinic")
                  : t("triageResultWait")}
            </h2>
            <p className="mt-2 text-lg opacity-90">{result.condition}</p>
          </div>

          <div className="mb-6 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 font-semibold text-amber-800">
                {t("recommendation")}
              </h3>
              <p className="text-gray-700">{result.recommendation}</p>
            </div>

            {result.referral_advised && (
              <Button
                onClick={openGoogleMaps}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 text-base font-bold text-white hover:bg-amber-700"
              >
                <MapPin className="h-5 w-5" />
                {t("nearestFacility")}
              </Button>
            )}

            {!!result.follow_up_questions?.length && (
              <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                <h3 className="mb-2 font-semibold text-amber-800">
                  {t("follow_up_questions")}
                </h3>
                <ul className="list-inside list-disc space-y-1 text-gray-700">
                  {result.follow_up_questions?.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 rounded-xl border-amber-300 text-amber-700"
            >
              {t("start")}
            </Button>
            <Button
              onClick={handleStartTriage}
              className="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
            >
              {t("newTriage")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-amber-600"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t("cancel")}
            </Button>
            <span className="text-sm font-medium text-amber-600">
              {t("step")} {stepIndex} {t("of")} {totalSteps}
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 flex-1 rounded-full transition-colors",
                  i < stepIndex ? "bg-amber-500" : "bg-amber-200",
                )}
              />
            ))}
          </div>
        </div>

        {step === "step-1" && (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-amber-900">
              {t("whoIsThisFor")}
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => {
                  setWhoFor("self");
                  goToStep("step-2", 2);
                }}
                className="flex h-20 w-full items-center gap-4 rounded-2xl border-2 border-amber-200 bg-white px-6 text-left text-lg font-medium text-amber-900 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
              >
                <User className="h-8 w-8 text-amber-500" />
                {t("myself")}
              </button>
              <button
                onClick={() => {
                  setWhoFor("someone-else");
                  goToStep("step-2", 2);
                }}
                className="flex h-20 w-full items-center gap-4 rounded-2xl border-2 border-amber-200 bg-white px-6 text-left text-lg font-medium text-amber-900 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
              >
                <Users className="h-8 w-8 text-amber-500" />
                {t("someoneElse")}
              </button>
            </div>
          </div>
        )}

        {step === "step-2" && (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-amber-900">
              {t("ageRangeQuestion")}
            </h2>
            <div className="space-y-3">
              {AGE_RANGES.map((range) => (
                <button
                  key={range.value}
                  onClick={() => {
                    setAgeRange(range.value);
                    goToStep("step-3", 3);
                  }}
                  className={cn(
                    "flex h-16 w-full items-center gap-4 rounded-2xl border-2 bg-white px-5 text-left text-base font-medium shadow-sm transition-all hover:shadow-md",
                    ageRange === range.value
                      ? "border-amber-500 text-amber-900"
                      : "border-amber-200 text-amber-800 hover:border-amber-400",
                  )}
                >
                  <range.icon className="h-6 w-6 text-amber-500" />
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "step-3" && (
          <div>
            <h2 className="mb-2 text-2xl font-bold text-amber-900">
              {t("triageDescribeSymptoms")}
            </h2>
            <p className="mb-4 text-sm text-amber-600">
              {t("describeSymptomsHint")}
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {CHIP_SYMPTOMS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSymptoms((prev) =>
                      prev ? `${prev}, ${s.toLowerCase()}` : s.toLowerCase(),
                    );
                  }}
                  className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-100"
                >
                  {s}
                </button>
              ))}
            </div>

            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder={t("symptomsPlaceholder")}
              className="min-h-[140px] w-full resize-none rounded-2xl border-2 border-amber-200 bg-white p-4 text-base text-amber-900 placeholder:text-amber-400 focus:border-amber-500 focus:outline-none"
            />

            <div className="mt-6">
              <Button
                onClick={() => goToStep("step-4", 4)}
                disabled={!symptoms.trim()}
                className="h-14 w-full rounded-2xl bg-amber-600 text-base font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {t("next")}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {step === "step-4" && (
          <div>
            <h2 className="mb-6 text-2xl font-bold text-amber-900">
              {t("durationQuestion")}
            </h2>
            <div className="space-y-3">
              {DURATIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => {
                    setDuration(d.value);
                    goToStep("step-5", 5);
                  }}
                  className={cn(
                    "flex h-16 w-full items-center gap-4 rounded-2xl border-2 bg-white px-5 text-left text-base font-medium shadow-sm transition-all hover:shadow-md",
                    duration === d.value
                      ? "border-amber-500 text-amber-900"
                      : "border-amber-200 text-amber-800 hover:border-amber-400",
                  )}
                >
                  <Clock className="h-6 w-6 text-amber-500" />
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "step-5" && (
          <div>
            <h2 className="mb-2 text-2xl font-bold text-amber-900">
              {t("additionalSymptoms")}
            </h2>
            <p className="mb-4 text-sm text-amber-600">
              {t("additionalSymptomsHint")}
            </p>

            <div className="mb-6 flex flex-wrap gap-2">
              {CHIP_SYMPTOMS.filter(
                (s) => !symptoms.toLowerCase().includes(s.toLowerCase()),
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => toggleChip(s)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    additionalSymptoms.includes(s)
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-amber-300 bg-white text-amber-700 hover:bg-amber-100",
                  )}
                >
                  {additionalSymptoms.includes(s) ? "✓ " : ""}
                  {s}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-medium text-amber-800">
                {t("summary")}
              </h3>
              <p className="text-sm text-gray-600">
                <strong>{t("symptoms")}:</strong> {symptoms}
                {additionalSymptoms.length > 0 &&
                  `, ${additionalSymptoms.join(", ")}`}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                <strong>{t("duration")}:</strong>{" "}
                {DURATIONS.find((d) => d.value === duration)?.label ||
                  t("justStarted")}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                <strong>{t("patient")}:</strong>{" "}
                                {whoFor === "self" ? t("myself") : t("someoneElse")} {" "}
                {ageRange &&
                  `(${AGE_RANGES.find((a) => a.value === ageRange)?.label})`}
              </p>
            </div>

            <div className="mt-6">
              <Button
                onClick={handleAnalyze}
                className="h-14 w-full rounded-2xl bg-amber-600 text-base font-bold text-white hover:bg-amber-700"
              >
                <Activity className="mr-2 h-5 w-5" />
                {t("triageStart")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
