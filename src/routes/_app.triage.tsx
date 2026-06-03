import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { CameraCapture } from "@/components/CameraCapture";
import { AssessmentResult } from "@/components/AssessmentResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  ScanLine,
  ChevronRight,
  Save,
  Volume2,
  Mic,
  MicOff,
  MessageSquare,
  Stethoscope,
  Check,
  AlertTriangle,
  Sun,
} from "lucide-react";
import {
  triageImage,
  detectEngine,
  isLoaded,
  loadEngine,
  loadEngineWithFallback,
  initVoiceConversation,
  nextVoiceTurn,
  type ConvMessage,
  type EngineKind,
} from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import { assessImageQuality, getQualityLabel, type QualityResult } from "@/lib/image-quality";
import { enhanceImage, isLowLight, type EnhancementMetadata } from "@/lib/image-processing";
import type { TriageResult, Patient, Assessment, VitalSigns, ConsentRecord } from "@/types/trij";
import { checkRedFlags, type RedFlagResult, type SymptomInput } from "@/lib/red-flags";
import { evaluateVitalSigns } from "@/lib/vital-signs";
import { checkForNotifiableConditions } from "@/lib/outbreak-flags";
import { VitalSignsInput } from "@/components/VitalSignsInput";
import { NutritionAssessment } from "@/components/NutritionAssessment";
import type { NutritionAssessmentResult } from "@/lib/nutrition";
import { SymptomChecklist } from "@/components/SymptomChecklist";
import { getChecklistForPresentation } from "@/lib/symptom-checklists";
import { ConsentCapture } from "@/components/ConsentCapture";
import { RedFlagAlert } from "@/components/RedFlagAlert";
import {
  assessImci,
  getOverallUrgency,
  getClassificationLabel,
  getImciAction,
  type ImciClassification,
  type ImciDangerSign,
} from "@/lib/imci";
import { getDB } from "@/lib/db";
import { queuePatient, queueAssessment } from "@/lib/sync";
import { useAuditLog } from "@/hooks/useAuditLog";
import { saveVoiceDraft, getVoiceDraft, clearVoiceDraft, listVoiceDrafts } from "@/lib/voice-draft";
import { getCurrentPosition } from "@/lib/geolocation";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  hasCompletedThisWeek,
  saveWellBeingCheckInLocally,
  syncWellBeingCheckIn,
  calculateWellBeingScore,
  getWeekStart,
} from "@/lib/well-being";
import type { WellBeingCheckIn as WellBeingCheckInData } from "@/types/trij";
import { WellBeingCheckIn } from "@/components/WellBeingCheckIn";
import { VoiceAssistant } from "@/lib/voice";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { CloudInferenceIndicator } from "@/components/CloudInferenceIndicator";
import { AiFailureOverlay, classifyAiError } from "@/components/AiFailureOverlay";
import type { AiFailureKind } from "@/components/AiFailureOverlay";
import { AiFeedbackWidget } from "@/components/AiFeedbackWidget";
import { SaliencyOverlay } from "@/components/SaliencyOverlay";
import { detectMemoryPressure, getEngineSuggestion, subscribeToMemoryPressure, startMemoryMonitoring, type MemoryPressureLevel } from "@/lib/memory-manager";
import type { AiFeedback } from "@/types/trij";

interface QAPair {
  question: string;
  answer: string;
}

export const Route = createFileRoute("/_app/triage")({
  head: () => ({
    meta: [
      {
        title: "New Triage — AI Medical Triage Assessment | Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Perform a free AI-assisted medical triage assessment. Assess wounds, rashes, respiratory symptoms, fever, and more. Get instant urgency classification (Green/Yellow/Red) with confidence scoring — all on-device, no internet required.",
      },
      {
        property: "og:title",
        content: "New Triage — AI Medical Triage Assessment | Trij",
      },
      {
        property: "og:description",
        content:
          "Free AI-powered medical triage assessment. Describe symptoms or snap a photo for instant urgency level and treatment recommendation — all offline.",
      },
      {
        name: "twitter:title",
        content: "New Triage — AI Medical Triage Assessment | Trij",
      },
      {
        name: "twitter:description",
        content:
          "Free AI-powered medical triage assessment. Describe symptoms or snap a photo for instant urgency level and treatment recommendation — all offline.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="triage">
      <TriagePage />
    </I18nErrorBoundary>
  ),
});

type Step =
  | "patient"
  | "presentation"
  | "vitals"
  | "nutrition"
  | "symptoms"
  | "capture"
  | "quality"
  | "analyzing"
  | "result"
  | "voice"
  | "imci";

const DANGER_SIGN_ITEMS = [
  { value: "unable_to_drink", key: "imciUnableToDrink" },
  { value: "vomits_everything", key: "imciVomitsEverything" },
  { value: "convulsions", key: "imciConvulsions" },
  { value: "lethargic", key: "imciLethargic" },
  { value: "chest_indrawing", key: "imciChestIndrawing" },
  { value: "stridor", key: "imciStridor" },
  { value: "central_cyanosis", key: "imciCentralCyanosis" },
];

interface ImciCheckboxItem {
  key: string;
  i18nKey: string;
  checked: boolean;
  setter: (v: boolean) => void;
}

function TriagePage() {
  const { t } = useI18n();
  const user = useSessionStore((s) => s.user);
  const { log } = useAuditLog();
  const language = useSettingsStore((s) => s.language);
  const engineKind = useSettingsStore((s) => s.engineKind);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const minConfidenceForLocalCare = useSettingsStore((s) => s.minConfidenceForLocalCare);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceTestMode = useSettingsStore((s) => s.voiceTestMode);
  const malariaEndemic = useSettingsStore((s) => s.malariaEndemic);
  const navigate = useNavigate();
  const voice = useVoiceGuidance();
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [hasCheckedThisWeek, setHasCheckedThisWeek] = useState(false);
  const [shouldShowCheckIn, setShouldShowCheckIn] = useState(false);

  useEffect(() => {
    if (!offlineUser) return;
    const completedThisWeek = hasCompletedThisWeek(offlineUser.id);
    setHasCheckedThisWeek(completedThisWeek);
  }, [offlineUser]);

  /* Start memory monitoring on mount */
  useEffect(() => {
    const stop = startMemoryMonitoring(30000);
    return stop;
  }, []);

  const triggerCheckIn = () => {
    if (!offlineUser || hasCheckedThisWeek) return;
    setShouldShowCheckIn(true);
    setTimeout(() => setShowCheckIn(true), 100);
  };

  const handleWellBeingSubmit = (responses: [number, number, number]) => {
    if (!offlineUser) return;
    const score = calculateWellBeingScore(responses);
    const weekStart = getWeekStart(new Date());
    const checkIn: WellBeingCheckInData = {
      id: `wb-${offlineUser.id}-${weekStart}-${Date.now()}`,
      chwUserId: offlineUser.id,
      weekStartDate: weekStart,
      responses,
      score,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    saveWellBeingCheckInLocally(checkIn);
    syncWellBeingCheckIn(checkIn).catch(console.error);
    setHasCheckedThisWeek(true);
    setShowCheckIn(false);
    setShouldShowCheckIn(false);
  };

  const handleWellBeingSkip = () => {
    setShowCheckIn(false);
    setShouldShowCheckIn(false);
  };

  const [step, setStep] = useState<Step>("patient");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "other">("F");
  /* Presentation type — selected after patient info, before vitals */
  const [presentationType, setPresentationType] = useState<string>("dermatology");
  const [symptomDescription, setSymptomDescription] = useState("");
  /* Vital signs state — collected after patient info, before photo capture */
  const [vitalSigns, setVitalSigns] = useState<{
    systolicBP: string;
    diastolicBP: string;
    heartRate: string;
    respiratoryRate: string;
    temperature: string;
    oxygenSaturation: string;
    muac: string;
    weight: string;
    painScale: string;
  }>({
    systolicBP: "",
    diastolicBP: "",
    heartRate: "",
    respiratoryRate: "",
    temperature: "",
    oxygenSaturation: "",
    muac: "",
    weight: "",
    painScale: "",
  });
  const [nutritionResult, setNutritionResult] = useState<NutritionAssessmentResult | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"camera" | "gallery">("camera");
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [qualityWarnProceed, setQualityWarnProceed] = useState(false);
  const [enhancementMeta, setEnhancementMeta] = useState<EnhancementMetadata | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhanceEnabled, setEnhanceEnabled] = useState(true);
  const [showEnhancement, setShowEnhancement] = useState(false);
  const [voiceHistory, setVoiceHistory] = useState<QAPair[]>([]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const aiFeedbackRef = useRef<AiFeedback | undefined>(undefined);
  const voiceRef = useRef<VoiceAssistant | null>(null);
  const convoRef = useRef<ConvMessage[]>([]);
  const kindRef = useRef<EngineKind>("webllm");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [aiFailureKind, setAiFailureKind] = useState<AiFailureKind | null>(null);
  const [pendingCapture, setPendingCapture] = useState<string | null>(null);
  const [redFlagResult, setRedFlagResult] = useState<RedFlagResult | null>(null);
  const [showRedFlagAlert, setShowRedFlagAlert] = useState(false);
  const [notifiableFlags, setNotifiableFlags] = useState<
    Array<{ condition: string; matchedKeyword: string }>
  >([]);
  const [imciActive, setImciActive] = useState(false);
  const [imciAgeMonths, setImciAgeMonths] = useState("");
  const [imciDangerSigns, setImciDangerSigns] = useState<ImciDangerSign[]>([]);
  const [imciRR, setImciRR] = useState("");
  const [imciDiarrhoea, setImciDiarrhoea] = useState(false);
  const [imciDiarrhoeaDays, setImciDiarrhoeaDays] = useState("");
  const [imciBloodInStool, setImciBloodInStool] = useState(false);
  const [imciSunkenEyes, setImciSunkenEyes] = useState(false);
  const [imciDrinksPoorly, setImciDrinksPoorly] = useState(false);
  const [imciCoughDays, setImciCoughDays] = useState("");
  const [imciFeverDays, setImciFeverDays] = useState("");
  const [imciOedema, setImciOedema] = useState(false);
  const [imciPallor, setImciPallor] = useState(false);
  const [imciResult, setImciResult] = useState<ImciClassification[] | null>(null);
  const imciDiarrhoeaCheckboxes: ImciCheckboxItem[] = [
    {
      key: "bloodInStool",
      i18nKey: "imciBloodInStool",
      checked: imciBloodInStool,
      setter: setImciBloodInStool,
    },
    {
      key: "sunkenEyes",
      i18nKey: "imciSunkenEyes",
      checked: imciSunkenEyes,
      setter: setImciSunkenEyes,
    },
    {
      key: "drinksPoorly",
      i18nKey: "imciDrinksPoorly",
      checked: imciDrinksPoorly,
      setter: setImciDrinksPoorly,
    },
  ];
  const pendingTextRef = useRef(false);

  /* Auto-save triage draft every 30 seconds */
  useEffect(() => {
    if (step === "result" || step === "analyzing" || step === "voice") return;
    if (step === "patient" && !patient) return;
    const interval = setInterval(() => {
      try {
        const draft = {
          step,
          patient,
          identifier,
          age,
          sex,
          presentationType,
          symptomDescription,
          vitalSigns,
          image,
          consent,
          savedAt: Date.now(),
        };
        localStorage.setItem("trij-triage-draft", JSON.stringify(draft));
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [
    step,
    patient,
    identifier,
    age,
    sex,
    presentationType,
    symptomDescription,
    vitalSigns,
    image,
    consent,
  ]);

  /* Restore draft on mount */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("trij-triage-draft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (Date.now() - draft.savedAt > 86400000) {
        localStorage.removeItem("trij-triage-draft");
        return;
      }
      if (draft.patient && draft.step !== "result" && draft.step !== "voice") {
        setPatient(draft.patient);
        setIdentifier(draft.identifier || "");
        setAge(draft.age || "");
        setSex(draft.sex || "F");
        setPresentationType(draft.presentationType || "dermatology");
        setSymptomDescription(draft.symptomDescription || "");
        if (draft.vitalSigns) setVitalSigns(draft.vitalSigns);
        if (draft.image) setImage(draft.image);
        setConsent(draft.consent || false);
      }
    } catch {}
  }, []);

  const clearDraft = () => {
    try {
      localStorage.removeItem("trij-triage-draft");
    } catch {}
  };

  useEffect(() => {
    if (!voiceRef.current) {
      voiceRef.current = new VoiceAssistant(language);
    }
    voiceRef.current.setLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!voice.active) return;
    if (voice.speaking || voice.listening) return;
    switch (step) {
      case "patient":
        voice.narrate(
          `${t("voiceGuideWhoIsPatient")} ${t("voiceGuidePatientId")} ${t("voiceGuideAge")} ${t("voiceGuideSex")} ${t("voiceGuideConsent")}`,
        );
        break;
      case "presentation":
        voice.narrate(t("presentationTypeTitle") + ". " + t("presentationTypeDesc"));
        break;
      case "vitals":
        voice.narrate(t("captureVitals") + ". " + t("vitalsDesc"));
        break;
      case "nutrition":
        voice.narrate(t("nutritionAssessment") + ". " + t("nutritionVoiceGuide"));
        break;
      case "symptoms":
        voice.narrate(t("symptomChecklist") + ". " + t("symptomChecklistDesc"));
        break;
      case "capture":
        voice.narrate(t("voiceGuideCapture"));
        break;
      case "analyzing":
        voice.narrate(t("analyzing") + "...");
        break;
      case "result":
        if (result) {
          const txt = [
            t("voiceGuideResult"),
            t("likelyCondition") + ": " + result.condition,
            t("voiceGuideConfidence").replace(
              "{pct}",
              String(
                Math.round(
                  typeof result.confidence === "number"
                    ? result.confidence
                    : (result.confidence?.confidence_point ?? 0),
                ),
              ),
            ),
            t("voiceGuideUrgency").replace("{level}", result.urgency),
            t("voiceGuideRecommended") + " " + (result.recommendation ?? ""),
          ].join(". ");
          voice.narrate(txt);
        }
        break;
    }
  }, [step, voice.active]);

  const [capturingLocation, setCapturingLocation] = useState(false);
  const [resumableDrafts, setResumableDrafts] = useState<
    Awaited<ReturnType<typeof listVoiceDrafts>>
  >([]);

  useEffect(() => {
    if (!user) return;
    listVoiceDrafts(user.id)
      .then(setResumableDrafts)
      .catch(() => {});
  }, [user]);

  /* Monitor memory pressure and suggest switching engines */
  const prevPressure = useRef<MemoryPressureLevel>("normal");
  useEffect(() => {
    const unsub = subscribeToMemoryPressure((level) => {
      if (level === "critical" && prevPressure.current !== "critical") {
        toast.warning(t("memoryPressureCritical"), { duration: 6000 });
        if (engineKind === "auto") {
          kindRef.current = "demo";
        }
      }
      prevPressure.current = level;
    });
    return unsub;
  }, [engineKind, t]);

  const persistDraft = async (
    p: Patient,
    res: TriageResult,
    img: string,
    qa: QAPair[],
    currentQ: string,
    msgs: ConvMessage[],
    consentVal: boolean | ConsentRecord | null,
  ) => {
    try {
      await saveVoiceDraft({
        patientId: p.id,
        chwUserId: p.chwUserId,
        patient: p,
        triageResult: res,
        image: img,
        messages: msgs,
        qaHistory: qa,
        currentQuestion: currentQ,
        consent: consentVal as any,
      });
    } catch (err) {
      console.warn("Failed to save voice draft", err);
    }
  };

  const resumeDraft = async (patientId: string) => {
    const draft = await getVoiceDraft(patientId);
    if (!draft) return;
    setPatient(draft.patient);
    setIdentifier(draft.patient.identifier);
    setAge(draft.patient.ageYears ? String(draft.patient.ageYears) : "");
    setSex(draft.patient.sex ?? "F");
    setImage(draft.image);
    setResult(draft.triageResult);
    setVoiceHistory(draft.qaHistory);
    setCurrentQuestion(draft.currentQuestion);
    setConsent(draft.consent as any);
    convoRef.current = draft.messages;
    setStep("voice");
    toast.success("Resumed voice interview");
  };

  const startPatient = async () => {
    if (!user || !identifier.trim()) return;
    setCapturingLocation(true);
    const coords = await getCurrentPosition();
    setCapturingLocation(false);
    if (coords) {
      toast.success(`${t("locationCaptured")} (±${Math.round(coords.accuracy ?? 0)}m)`);
    } else {
      toast.info(t("locationUnavailable"));
    }
    const p: Patient = {
      id: crypto.randomUUID(),
      chwUserId: user.id,
      identifier: identifier.trim(),
      ageYears: age ? Number(age) : undefined,
      sex,
      locationLat: coords?.lat,
      locationLng: coords?.lng,
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await queuePatient(p);
    log("patient:create", { resourceType: "patient", resourceId: p.id, patientId: p.id });
    setPatient(p);
    if (age && Number(age) < 5) {
      setStep("imci");
    } else {
      setStep("presentation");
    }
  };

  const onVitalsComplete = () => {
    const vs = buildVitalSigns();
    if (vs && age) {
      const eval_ = evaluateVitalSigns(vs, Number(age));
      if (eval_.urgencyOverride === "red") {
        toast.warning(t("vitalSignsCritical"), { duration: 5000 });
      } else if (eval_.urgencyOverride === "yellow") {
        toast.info(t("vitalSignsAbnormal"), { duration: 4000 });
      }
    }
    setStep("nutrition");
  };

  const skipVitals = () => {
    setVitalSigns({
      systolicBP: "",
      diastolicBP: "",
      heartRate: "",
      respiratoryRate: "",
      temperature: "",
      oxygenSaturation: "",
      muac: "",
      weight: "",
      painScale: "",
    });
    setStep("nutrition");
  };

  const onNutritionComplete = (result: NutritionAssessmentResult) => {
    setNutritionResult(result);
    setStep("symptoms");
  };

  const skipNutrition = () => {
    setNutritionResult(null);
    setStep("symptoms");
  };

  const onSymptomsComplete = () => {
    setStep("capture");
  };

  const skipSymptoms = () => {
    setSymptoms([]);
    setStep("capture");
  };

  const runImciAssessment = () => {
    const ageMonths = imciAgeMonths ? Number(imciAgeMonths) : Number(age) * 12;
    const classifications = assessImci({
      ageMonths,
      dangerSigns: imciDangerSigns,
      respiratoryRate: imciRR ? Number(imciRR) : 0,
      chestIndrawing: imciDangerSigns.includes("chest_indrawing"),
      stridor: imciDangerSigns.includes("stridor"),
      temperature: vitalSigns.temperature ? Number(vitalSigns.temperature) : 37,
      muacCm: vitalSigns.muac ? Number(vitalSigns.muac) : 15,
      weightKg: vitalSigns.weight ? Number(vitalSigns.weight) : 0,
      hasDiarrhoea: imciDiarrhoea,
      diarrhoeaDays: imciDiarrhoeaDays ? Number(imciDiarrhoeaDays) : 0,
      bloodInStool: imciBloodInStool,
      sunkenEyes: imciSunkenEyes,
      unableToDrink: imciDangerSigns.includes("unable_to_drink"),
      drinksPoorly: imciDrinksPoorly,
      vomiting: imciDangerSigns.includes("vomits_everything"),
      coughDays: imciCoughDays ? Number(imciCoughDays) : 0,
      feverDays: imciFeverDays ? Number(imciFeverDays) : 0,
      malariaEndemic,
      convulsingNow: imciDangerSigns.includes("convulsions"),
      oedema: imciOedema,
      pallor: imciPallor,
    });
    setImciResult(classifications);

    const overallUrgency = getOverallUrgency(classifications);
    const imciTriageResult: TriageResult = {
      condition: classifications.map((c) => getClassificationLabel(c.category)).join("; "),
      confidence: {
        confidence_point: 100,
        confidence_interval: [95, 100],
        uncertainty_source: "model_knowledge",
        uncertainty_reason: "IMCI algorithm-based assessment with clear diagnostic criteria",
      },
      urgency: overallUrgency,
      possible_conditions: classifications.map((c) => ({
        name: getClassificationLabel(c.category),
        probability: 100 / classifications.length,
      })),
      key_visual_features: [],
      recommendation: getImciAction(classifications),
      referral_advised: overallUrgency === "red",
    };
    setResult(imciTriageResult);
    setStep("result");
  };

  const onCapture = async (dataUrl: string) => {
    setImage(dataUrl);
    setEnhancedImage(null);
    setEnhancementMeta(null);
    setEnhanceEnabled(true);
    setShowEnhancement(false);

    let effectiveUrl = dataUrl;
    let effectiveMeta: EnhancementMetadata | null = null;

    const isDark = await isLowLight(dataUrl);
    if (isDark) {
      const { result: enhancedUrl, metadata } = await enhanceImage(dataUrl);
      setEnhancedImage(enhancedUrl);
      setEnhancementMeta(metadata);
      setShowEnhancement(true);
      if (metadata.applied) {
        effectiveUrl = enhancedUrl;
        effectiveMeta = metadata;
      }
    }

    setProgress(0);
    setProgressText(t("checkingQuality"));
    const q = await assessImageQuality(dataUrl);
    setQualityResult(q);
    if (q.score < 60) {
      setStep("quality");
      return;
    }
    if (q.score < 80) {
      setStep("quality");
      return;
    }
    proceedWithAnalysis(effectiveUrl);
  };

  const proceedWithAnalysis = async (dataUrl: string) => {
    const pressure = detectMemoryPressure();
    if (pressure === "critical" && engineKind === "auto") {
      kindRef.current = "demo";
      setStep("analyzing");
      toast.warning(t("memoryPressureCritical"), { duration: 5000 });
    }
    if (pressure === "warning" && engineKind === "auto") {
      toast.info(t("memoryPressureWarning"), { duration: 4000 });
    }

    setStep("analyzing");
    try {
      let kind = engineKind === "auto" ? await detectEngine() : engineKind;
      kindRef.current = kind;

      if (!isLoaded(kind)) {
        try {
          const loadResult = await loadEngineWithFallback(kind, (r) => {
            setProgress(Math.round((r.progress || 0) * 100));
            setProgressText(r.text || t("preparing") + "...");
          });

          // Update the kind if fallback was used
          if (loadResult.fallbackUsed) {
            console.log(`Engine fallback used: ${kind} → ${loadResult.kind}`);
            kindRef.current = loadResult.kind;
            kind = loadResult.kind;

            // Show a toast notification about the fallback
            toast.info(
              `Using ${loadResult.kind.toUpperCase()} engine instead of requested ${engineKind.toUpperCase()}`,
              { duration: 3000 },
            );
          }
        } catch (err) {
          console.error("Engine load failed", err);
          setAiFailureKind("model_not_ready");
          setPendingCapture(dataUrl);
          setStep("capture");
          return;
        }
      }

      setProgressText(t("analyzing") + "...");
      setProgress(100);
      const r = await triageImage(
        dataUrl,
        language,
        kind,
        ollamaUrl,
        presentationType,
        symptomDescription,
      );

      const vs = buildVitalSigns();
      const symptomInput = mapToSymptomInput(
        vs,
        symptomDescription,
        presentationType,
        age ? Number(age) : undefined,
        sex,
      );
      const redFlagCheck = checkRedFlags(symptomInput);
      if (redFlagCheck.detected) {
        const overridden = { ...r, urgency: "red" as const };
        setResult(overridden);
        setRedFlagResult(redFlagCheck);
        setShowRedFlagAlert(true);
        log("red_flag:triggered", {
          resourceType: "assessment",
          resourceId: "",
          details: JSON.stringify(
            redFlagCheck.flags.map((f) => ({
              id: f.rule.id,
              condition: f.rule.name,
              severity: f.rule.severity,
              category: f.rule.category,
            })),
          ),
        });
      } else {
        setResult(r);
      }

      const outbreakMatches = checkForNotifiableConditions(r.condition, r.possible_conditions);
      setNotifiableFlags(outbreakMatches as any);
      if (outbreakMatches.length > 0) {
        toast.warning(t("outbreakAlert"), { duration: 8000 });
        log("alert:outbreak_condition" as any, {
          resourceType: "assessment",
          resourceId: "",
          details: JSON.stringify(
            outbreakMatches.map((m) => ({
              condition: m.condition.name,
              keyword: m.matchedKeyword,
            })),
          ),
        });
      }

      setStep("result");

      // Release GPU buffers to free memory
      const { releaseGpuBuffers } = await import("@/lib/memory-manager");
      releaseGpuBuffers().catch(() => {});
    } catch (err) {
      setAiFailureKind(classifyAiError(err));
      setPendingCapture(dataUrl);
      setStep("capture");
    }
  };

  const onTextOnlyAnalyze = async () => {
    /* For non-dermatology assessments, use a placeholder image and pass the symptom description */
    pendingTextRef.current = true;
    setStep("analyzing");
    try {
      let kind = engineKind === "auto" ? await detectEngine() : engineKind;
      kindRef.current = kind;

      if (!isLoaded(kind)) {
        try {
          const loadResult = await loadEngineWithFallback(kind, (r) => {
            setProgress(Math.round((r.progress || 0) * 100));
            setProgressText(r.text || t("preparing") + "...");
          });

          // Update the kind if fallback was used
          if (loadResult.fallbackUsed) {
            console.log(`Engine fallback used: ${kind} → ${loadResult.kind}`);
            kindRef.current = loadResult.kind;
            kind = loadResult.kind;

            // Show a toast notification about the fallback
            toast.info(
              `Using ${loadResult.kind.toUpperCase()} engine instead of requested ${engineKind.toUpperCase()}`,
              { duration: 3000 },
            );
          }
        } catch (err) {
          console.error("Engine load failed", err);
          setAiFailureKind("model_not_ready");
          setPendingCapture("");
          setStep("capture");
          return;
        }
      }

      setProgressText(t("analyzing") + "...");
      setProgress(100);
      const r = await triageImage(
        "",
        language,
        kind,
        ollamaUrl,
        presentationType,
        symptomDescription,
      );

      const vs = buildVitalSigns();
      const symptomInput = mapToSymptomInput(
        vs,
        symptomDescription,
        presentationType,
        age ? Number(age) : undefined,
        sex,
      );
      const redFlagCheck = checkRedFlags(symptomInput);
      if (redFlagCheck.detected) {
        const overridden = { ...r, urgency: "red" as const };
        setResult(overridden);
        setRedFlagResult(redFlagCheck);
        setShowRedFlagAlert(true);
        log("red_flag:triggered", {
          resourceType: "assessment",
          resourceId: "",
          details: JSON.stringify(
            redFlagCheck.flags.map((f) => ({
              id: f.rule.id,
              condition: f.rule.name,
              severity: f.rule.severity,
              category: f.rule.category,
            })),
          ),
        });
      } else {
        setResult(r);
      }

      const outbreakMatches = checkForNotifiableConditions(r.condition, r.possible_conditions);
      setNotifiableFlags(outbreakMatches as any);
      if (outbreakMatches.length > 0) {
        toast.warning(t("outbreakAlert"), { duration: 8000 });
        log("alert:outbreak_condition" as any, {
          resourceType: "assessment",
          resourceId: "",
          details: JSON.stringify(
            outbreakMatches.map((m) => ({
              condition: m.condition.name,
              keyword: m.matchedKeyword,
            })),
          ),
        });
      }

      setStep("result");
    } catch (err) {
      setAiFailureKind(classifyAiError(err));
      setPendingCapture("");
      setStep("capture");
    }
  };

  const buildVitalSigns = () => {
    const parsed = {
      systolicBP: vitalSigns.systolicBP ? Number(vitalSigns.systolicBP) : undefined,
      diastolicBP: vitalSigns.diastolicBP ? Number(vitalSigns.diastolicBP) : undefined,
      heartRate: vitalSigns.heartRate ? Number(vitalSigns.heartRate) : undefined,
      respiratoryRate: vitalSigns.respiratoryRate ? Number(vitalSigns.respiratoryRate) : undefined,
      temperature: vitalSigns.temperature ? Number(vitalSigns.temperature) : undefined,
      oxygenSaturation: vitalSigns.oxygenSaturation
        ? Number(vitalSigns.oxygenSaturation)
        : undefined,
      muac: vitalSigns.muac ? Number(vitalSigns.muac) : undefined,
      weight: vitalSigns.weight ? Number(vitalSigns.weight) : undefined,
      painScale: vitalSigns.painScale ? Number(vitalSigns.painScale) : undefined,
    };
    /* Only include vitals if at least one field has a value */
    const hasAny = Object.values(parsed).some((v) => v !== undefined);
    return hasAny ? (parsed as VitalSigns) : undefined;
  };

  /**
   * Map triage data to SymptomInput format for red flag detection
   * Converts vital signs, symptom description, and presentation type into structured symptom fields
   */
  const mapToSymptomInput = (
    vitals: VitalSigns | undefined,
    description: string,
    presentation: string,
    patientAge?: number,
    patientSex?: "M" | "F" | "other",
  ): SymptomInput => {
    const input: SymptomInput = {
      age: patientAge,
    };

    // Map vital signs to SymptomInput fields
    if (vitals) {
      if (vitals.temperature && vitals.temperature >= 38) {
        input.fever = true;
        input.feverTemperature = vitals.temperature;
      }
      if (vitals.respiratoryRate) {
        input.respiratoryRate = vitals.respiratoryRate;
        if (vitals.respiratoryRate > 30) {
          input.rapidBreathing = true;
        }
      }
      if (vitals.oxygenSaturation && vitals.oxygenSaturation < 90) {
        input.blueLips = true;
        input.blueSkin = true;
        input.shortnessOfBreath = true;
      }
      if (vitals.heartRate && vitals.heartRate > 120) {
        input.chestPain = true;
      }
    }

    // Parse symptom description for key phrases
    const desc = description.toLowerCase();

    // Neurological symptoms
    if (desc.includes("confus") || desc.includes("disorient")) {
      input.confusion = true;
      input.alteredConsciousness = true;
    }
    if (desc.includes("unconscious") || desc.includes("faint") || desc.includes("collapse")) {
      input.alteredConsciousness = true;
    }
    if (desc.includes("headache") && (desc.includes("severe") || desc.includes("bad"))) {
      input.severeHeadache = true;
    }
    if (desc.includes("stiff neck") || desc.includes("neck pain") || desc.includes("neck stiff")) {
      input.stiffNeck = true;
    }
    if (
      desc.includes("light sensitiv") ||
      desc.includes("photophobia") ||
      desc.includes("bright light")
    ) {
      input.photophobia = true;
    }
    if (
      desc.includes("face droop") ||
      desc.includes("facial droop") ||
      desc.includes("face uneven")
    ) {
      input.facialDroop = true;
    }
    if (desc.includes("arm weak") || desc.includes("weak arm") || desc.includes("numb arm")) {
      input.armWeakness = true;
    }
    if (
      desc.includes("slurr") ||
      desc.includes("speech difficult") ||
      desc.includes("hard to speak")
    ) {
      input.speechSlurring = true;
      input.difficultySpeaking = true;
    }
    if (desc.includes("weak") || desc.includes("numb")) {
      input.weakness = true;
      input.numbness = true;
    }
    if (
      desc.includes("vision") &&
      (desc.includes("blur") || desc.includes("change") || desc.includes("double"))
    ) {
      input.visionChanges = true;
    }

    // Cardiovascular symptoms
    if (
      desc.includes("chest pain") ||
      desc.includes("chest tight") ||
      desc.includes("heart attack")
    ) {
      input.chestPain = true;
    }
    if (
      desc.includes("short of breath") ||
      desc.includes("breathless") ||
      desc.includes("difficulty breath")
    ) {
      input.shortnessOfBreath = true;
      input.difficultyBreathing = true;
    }
    if (desc.includes("blue lip") || desc.includes("blue skin") || desc.includes("cyanosis")) {
      input.blueLips = true;
      input.blueSkin = true;
    }

    // Gastrointestinal symptoms
    if (
      desc.includes("severe abdom") ||
      (desc.includes("stomach pain") && desc.includes("severe"))
    ) {
      input.severeAbdominalPain = true;
    }
    if (
      desc.includes("vomit blood") ||
      desc.includes("coffee ground") ||
      desc.includes("hematemesis")
    ) {
      input.vomitingBlood = true;
    }
    if (desc.includes("black stool") || desc.includes("tarry stool") || desc.includes("melena")) {
      input.blackStool = true;
    }
    if (
      desc.includes("abdominal") &&
      (desc.includes("distend") || desc.includes("swollen") || desc.includes("bloated"))
    ) {
      input.abdominalDistension = true;
    }

    // Dehydration symptoms
    if (desc.includes("sunken eye") || desc.includes("eye sink")) {
      input.sunkenEyes = true;
    }
    if (
      desc.includes("no urine") ||
      desc.includes("not pass urine") ||
      desc.includes("unable to urinate")
    ) {
      input.noUrine = true;
    }
    if (
      desc.includes("unable to drink") ||
      desc.includes("cannot drink") ||
      desc.includes("refuse drink")
    ) {
      input.unableToDrink = true;
    }
    if (desc.includes("dry mouth") || desc.includes("thirsty") || desc.includes("thirst")) {
      input.dryMouth = true;
      input.thirst = true;
    }

    // Obstetric symptoms
    if (patientSex === "F") {
      if (
        desc.includes("pregnant") ||
        desc.includes("pregnancy") ||
        presentation === "obstetrics"
      ) {
        input.pregnancy = true;
        if (patientAge && patientAge >= 18) {
          input.pregnantTrimester = 3; // Default to third trimester for adults if pregnant
        }
      }
      if (desc.includes("bleed") && (desc.includes("vaginal") || desc.includes("pregnant"))) {
        input.vaginalBleeding = true;
      }
      if (desc.includes("fit") || desc.includes("seizure") || desc.includes("convulsion")) {
        if (input.pregnancy) {
          input.fitting = true;
          input.seizures = true;
        }
      }
      if (desc.includes("swelling") || desc.includes("edema")) {
        input.edema = true;
      }
    }

    // Malnutrition symptoms
    if (vitals?.muac && vitals.muac < 11.5) {
      input.severeWeightLoss = true;
      input.muscleWasting = true;
      input.marasmus = true;
    }
    if (desc.includes("weight loss") && desc.includes("severe")) {
      input.severeWeightLoss = true;
    }
    if (desc.includes("muscle waste") || desc.includes("wasting")) {
      input.muscleWasting = true;
    }
    if (desc.includes("kwashiorkor") || desc.includes("edema")) {
      input.kwashiorkor = true;
      input.edema = true;
    }

    // Diabetic symptoms
    if (desc.includes("diabetic") || desc.includes("diabetes")) {
      if (desc.includes("high sugar") || desc.includes("hyperglyc")) {
        input.highBloodSugar = true;
      }
      if (desc.includes("low sugar") || desc.includes("hypoglyc")) {
        input.lowBloodSugar = true;
      }
    }

    // General emergency symptoms
    if (desc.includes("fit") || desc.includes("seizure") || desc.includes("convulsion")) {
      input.fitting = true;
      input.seizures = true;
    }

    return input;
  };

  const save = async () => {
    if (!user || !patient || !result) return;
    const hasImage = !!image;
    voice.narrate(t("voiceGuideSaving"));
    const a: Assessment = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      chwUserId: user.id,
      images: hasImage ? [image!] : [],
      vitalSigns: buildVitalSigns(),
      condition: result.condition,
      presentationType:
        presentationType !== "dermatology"
          ? (presentationType as import("@/types/trij").PresentationType)
          : undefined,
      description: symptomDescription || undefined,
      icd10Code: result.icd10_code,
      confidence: result.confidence,
      urgency: result.urgency,
      possibleConditions: result.possible_conditions,
      keyVisualFeatures: result.key_visual_features,
      recommendation: result.recommendation,
      followUpQuestions: result.follow_up_questions,
      referralAdvised: result.referral_advised,
      referralStatus: result.referral_advised ? "pending" : "none",
      patientConsent: !!consent,
      consentTimestamp: consent?.capturedAt ?? new Date().toISOString(),
      consentRecord: consent ?? undefined,
      voiceLog:
        voiceHistory.length > 0
          ? voiceHistory.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n")
          : undefined,
      aiFeedback: aiFeedbackRef.current,
      imageEnhancement: enhancementMeta ?? undefined,
      nutrition: nutritionResult ?? undefined,
      symptoms: symptoms.length > 0 ? symptoms : undefined,
      language,
      imageSource,
      version: 0,
      createdAt: new Date().toISOString(),
    };
    await queueAssessment(a);
    log("assessment:create", {
      resourceType: "assessment",
      resourceId: a.id,
      patientId: a.patientId,
    });
    await clearVoiceDraft(patient.id).catch(() => {});
    clearDraft();
    voice.narrate(t("voiceGuideSaved"));
    toast.success(t("savedOffline"));

    // Trigger well-being check-in after work session
    triggerCheckIn();

    navigate({ to: "/patients/$patientId", params: { patientId: patient.id } });
  };

  const startVoiceAssessment = async () => {
    if (!result || !patient || !image) return;
    setVoiceHistory([]);
    convoRef.current = initVoiceConversation(language, result);
    setStep("voice");
    setVoiceBusy(true);
    try {
      const { decision, messages } = await nextVoiceTurn(
        convoRef.current,
        null,
        kindRef.current,
        ollamaUrl,
      );
      convoRef.current = messages;
      if (decision.done || !decision.question) {
        toast.info(t("noFollowUp"));
        setStep("result");
        return;
      }
      setCurrentQuestion(decision.question);
      await persistDraft(patient, result, image, [], decision.question, messages, consent);
      if (voiceEnabled) voiceRef.current?.speak(decision.question);
    } catch (err) {
      toast.error(t("voiceFailed") + ": " + (err as Error).message);
      setStep("result");
    } finally {
      setVoiceBusy(false);
    }
  };

  const handleVoiceAnswer = async (answer: string) => {
    if (!answer.trim() || !patient || !result || !image) return;
    const updated = [...voiceHistory, { question: currentQuestion, answer: answer.trim() }];
    setVoiceHistory(updated);
    setTypedAnswer("");
    if (updated.length >= 5) {
      await persistDraft(patient, result, image, updated, "", convoRef.current, consent);
      toast.success(t("voiceComplete"));
      setStep("result");
      return;
    }
    setVoiceBusy(true);
    try {
      const { decision, messages } = await nextVoiceTurn(
        convoRef.current,
        answer.trim(),
        kindRef.current,
        ollamaUrl,
      );
      convoRef.current = messages;
      if (decision.done || !decision.question) {
        await persistDraft(patient, result, image, updated, "", messages, consent);
        toast.success(t("voiceComplete"));
        setStep("result");
        return;
      }
      setCurrentQuestion(decision.question);
      await persistDraft(patient, result, image, updated, decision.question, messages, consent);
      if (voiceEnabled) voiceRef.current?.speak(decision.question);
    } catch (err) {
      toast.error(t("voiceFailed") + ": " + (err as Error).message);
    } finally {
      setVoiceBusy(false);
    }
  };

  const recordVoiceAnswer = async () => {
    const v = voiceRef.current;
    if (!v) {
      toast.error("Voice recognition not available. Type your answer instead.");
      return;
    }
    setVoiceBusy(true);
    try {
      const transcript = await v.listen();
      setVoiceBusy(false);
      if (transcript) {
        await handleVoiceAnswer(transcript);
      }
    } catch {
      setVoiceBusy(false);
      toast.error("Could not recognize speech. Type your answer instead.");
    }
  };

  const speak = (text: string) => {
    const v = new VoiceAssistant(language);
    v.speak(text);
  };

  return (
    <>
      {aiFailureKind && (
        <AiFailureOverlay
          kind={aiFailureKind}
          onRetry={() => {
            setAiFailureKind(null);
            if (pendingTextRef.current) {
              pendingTextRef.current = false;
              setTimeout(() => onTextOnlyAnalyze(), 100);
            } else if (pendingCapture !== null) {
              const data = pendingCapture;
              setPendingCapture(null);
              setTimeout(() => onCapture(data), 100);
            }
          }}
          onUseDemo={() => {
            setAiFailureKind(null);
            setPendingCapture(null);
            pendingTextRef.current = false;
            const data = pendingCapture;
            setPendingCapture(null);
            const runDemo = async () => {
              kindRef.current = "demo";
              setStep("analyzing");
              try {
                const r = await triageImage(
                  data || "",
                  language,
                  "demo",
                  ollamaUrl,
                  presentationType,
                  symptomDescription,
                );
                setResult(r);
                setStep("result");
              } catch {
                setStep("capture");
              }
            };
            runDemo();
          }}
          onManualAssessment={(r) => {
            setAiFailureKind(null);
            setPendingCapture(null);
            pendingTextRef.current = false;
            setResult(r);
            setStep("result");
          }}
          onDismiss={() => {
            setAiFailureKind(null);
            setPendingCapture(null);
            pendingTextRef.current = false;
          }}
        />
      )}
      {showRedFlagAlert && redFlagResult && (
        <RedFlagAlert
          redFlagResult={redFlagResult}
          onDismiss={() => {
            setShowRedFlagAlert(false);
            setRedFlagResult(null);
            log("red_flag:dismissed" as any, {
              resourceType: "assessment",
              resourceId: "",
              details: "User dismissed red flag alert",
            });
          }}
          onContinueToFacility={() => {
            setShowRedFlagAlert(false);
            log("red_flag:acknowledged" as any, {
              resourceType: "assessment",
              resourceId: "",
              details: "User acknowledged red flag and will continue to facility",
            });
          }}
        />
      )}
      <AppHeader title={t("newTriage")} subtitle={t("stepByStep")} />
      <div className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-5 overflow-x-hidden">
        <Stepper
          step={step}
          progress={progress}
          progressText={progressText}
          shouldShowCheckIn={shouldShowCheckIn}
          handleWellBeingSkip={handleWellBeingSkip}
          handleWellBeingSubmit={handleWellBeingSubmit}
        />

        {step === "patient" && (
          <div className="mt-7 space-y-5">
            {resumableDrafts.length > 0 && (
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <p className="text-sm font-medium">Resume voice interview</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  You have {resumableDrafts.length} unfinished interview
                  {resumableDrafts.length > 1 ? "s" : ""}.
                </p>
                <div className="mt-3 space-y-2">
                  {resumableDrafts.slice(0, 3).map((d) => (
                    <div
                      key={d.patientId}
                      className="flex items-center justify-between gap-2 rounded-lg bg-background/60 p-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.patient.identifier}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {d.qaHistory.length} answered · {new Date(d.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => resumeDraft(d.patientId)}>
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await clearVoiceDraft(d.patientId);
                            setResumableDrafts((arr) =>
                              arr.filter((x) => x.patientId !== d.patientId),
                            );
                          }}
                        >
                          Discard
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h2 className="font-display text-xl font-semibold">{t("whoIsPatient")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("patientCodeDesc")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="patient-id">{t("patientIdentifier")}</Label>
              <div className="flex gap-2">
                <Input
                  id="patient-id"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. AP-0142"
                  className="flex-1"
                />
                {voice.active && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      const id = await voice.ask(
                        voice.language === "en-US"
                          ? "Say the patient ID"
                          : t("voiceGuidePatientId"),
                      );
                      if (id) setIdentifier(id);
                    }}
                    disabled={voice.listening}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="patient-age">{t("ageYears")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="patient-age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    type="number"
                    min={0}
                    max={120}
                    className="flex-1"
                  />
                  {voice.active && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        const a = await voice.ask(
                          voice.language === "en-US" ? "Say the age in years" : t("voiceGuideAge"),
                        );
                        if (a) {
                          const num = a.replace(/\D/g, "");
                          if (num) setAge(num);
                        }
                      }}
                      disabled={voice.listening}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("sex")}</Label>
                <div className="flex rounded-lg border p-1" role="radiogroup" aria-label={t("sex")}>
                  {(["F", "M", "other"] as const).map((s) => (
                    <button
                      key={s}
                      role="radio"
                      aria-checked={sex === s}
                      onClick={() => setSex(s)}
                      className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${sex === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {voice.active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 w-full gap-1 text-xs"
                    onClick={async () => {
                      const s = await voice.ask(
                        voice.language === "en-US"
                          ? "Say male, female, or other"
                          : t("voiceGuideSex"),
                      );
                      if (s) {
                        const lower = s.toLowerCase();
                        if (
                          lower.includes("female") ||
                          lower.includes("f") ||
                          lower.includes("woman") ||
                          lower.includes("girl")
                        )
                          setSex("F");
                        else if (
                          lower.includes("male") ||
                          lower.includes("m") ||
                          lower.includes("man") ||
                          lower.includes("boy")
                        )
                          setSex("M");
                        else setSex("other");
                      }
                    }}
                    disabled={voice.listening}
                  >
                    <Mic className="mr-1 h-3 w-3" /> {t("voiceAssistant")}
                  </Button>
                )}
              </div>
            </div>
            <ConsentCapture onConsent={setConsent} disabled={capturingLocation} />
            {voice.active && !consent && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={async () => {
                  const ok = await voice.confirm(t("voiceGuideConsent"));
                  if (ok) {
                    setConsent(true as any);
                    voice.narrate(t("voiceGuideConsentConfirmed"));
                  }
                }}
                disabled={voice.listening}
              >
                <Volume2 className="h-4 w-4" /> {t("voiceAssistant")} —{" "}
                {t("voiceGuideConsentConfirmed")}
              </Button>
            )}
            <Button
              onClick={startPatient}
              disabled={!identifier.trim() || !consent || capturingLocation}
              size="lg"
              className="w-full gap-2"
            >
              {capturingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("capturingLocation")}...
                </>
              ) : (
                <>
                  {t("continue")} <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {step === "presentation" && (
          <div className="mt-7 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold">{t("presentationTypeTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("presentationTypeDesc")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(
                [
                  ["dermatology", t("dermatologyIcon") || "Skin"],
                  ["respiratory", t("respiratoryIcon") || "Lungs"],
                  ["fever", t("feverIcon") || "Fever"],
                  ["gastrointestinal", t("giIcon") || "Stomach"],
                  ["neurological", t("neuroIcon") || "Brain"],
                  ["malnutrition", t("malnutritionIcon") || "Nutrition"],
                  ["eye_ear", t("eyeEarIcon") || "Eye/Ear"],
                  ["musculoskeletal", t("mskIcon") || "Joint"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPresentationType(value)}
                  className={`rounded-xl border-2 p-3 text-center text-sm font-medium transition-all ${
                    presentationType === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {presentationType !== "dermatology" && (
              <div className="space-y-2">
                <Label>{t("symptomDescription")}</Label>
                <textarea
                  value={symptomDescription}
                  onChange={(e) => setSymptomDescription(e.target.value)}
                  placeholder={t("symptomDescriptionPlaceholder")}
                  className="w-full rounded-xl border bg-card p-3 text-sm outline-none focus:border-primary"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">{t("symptomDescriptionHint")}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                onClick={() => setStep("vitals")}
                size="lg"
                className="flex-1 gap-2"
                disabled={presentationType !== "dermatology" && !symptomDescription.trim()}
              >
                {t("continue")} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "imci" && (
          <div className="mt-7 space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold">{t("imciPathway")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("imciDesc")}</p>
            </div>

            {!imciActive ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setImciActive(true);
                  }}
                  size="lg"
                  className="flex-1 gap-2"
                >
                  {t("start")} IMCI
                </Button>
                <Button
                  onClick={() => setStep("presentation")}
                  size="lg"
                  variant="outline"
                  className="flex-1"
                >
                  {t("skip")}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {Number(age) < 2 && (
                  <div className="space-y-1.5">
                    <Label>{t("imciAgeMonthsLabel")}</Label>
                    <Input
                      value={imciAgeMonths}
                      onChange={(e) => setImciAgeMonths(e.target.value)}
                      type="number"
                      min={0}
                      max={24}
                      placeholder={t("imciAgeMonths")}
                    />
                  </div>
                )}

                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t("imciDangerSigns")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t("imciDangerSignsDesc")}</p>
                  <div className="mt-3 space-y-2">
                    {DANGER_SIGN_ITEMS.map((item) => (
                      <label key={item.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={imciDangerSigns.includes(item.value as ImciDangerSign)}
                          onChange={() => {
                            setImciDangerSigns((prev) =>
                              prev.includes(item.value as ImciDangerSign)
                                ? prev.filter((d) => d !== item.value)
                                : [...prev, item.value as ImciDangerSign],
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {t(item.key as any)}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("imciNoneOfThese")} — {imciDangerSigns.length === 0 ? "✓" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("imciRespiratoryRate")}</Label>
                    <Input
                      value={imciRR}
                      onChange={(e) => setImciRR(e.target.value)}
                      type="number"
                      min={0}
                      max={200}
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("coughDays" as any) || "Days with cough"}</Label>
                    <Input
                      value={imciCoughDays}
                      onChange={(e) => setImciCoughDays(e.target.value)}
                      type="number"
                      min={0}
                      max={90}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("feverDays" as any) || "Days with fever"}</Label>
                    <Input
                      value={imciFeverDays}
                      onChange={(e) => setImciFeverDays(e.target.value)}
                      type="number"
                      min={0}
                      max={90}
                      placeholder="0"
                    />
                  </div>
                </div>

                <Button onClick={runImciAssessment} size="lg" className="w-full gap-2">
                  {t("continue")} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "vitals" && (
          <div className="mt-7 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold">{t("imciPathway")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("imciDesc")}</p>
            </div>

            {!imciActive ? (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setImciActive(true);
                  }}
                  size="lg"
                  className="flex-1 gap-2"
                >
                  {t("start")} IMCI
                </Button>
                <Button
                  onClick={() => setStep("presentation")}
                  size="lg"
                  variant="outline"
                  className="flex-1"
                >
                  {t("skip")}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {Number(age) < 2 && (
                  <div className="space-y-1.5">
                    <Label>{t("imciAgeMonthsLabel")}</Label>
                    <Input
                      value={imciAgeMonths}
                      onChange={(e) => setImciAgeMonths(e.target.value)}
                      type="number"
                      min={0}
                      max={24}
                      placeholder={t("imciAgeMonths")}
                    />
                  </div>
                )}

                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t("imciDangerSigns")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{t("imciDangerSignsDesc")}</p>
                  <div className="mt-3 space-y-2">
                    {DANGER_SIGN_ITEMS.map((item) => (
                      <label key={item.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={imciDangerSigns.includes(item.value as ImciDangerSign)}
                          onChange={() => {
                            setImciDangerSigns((prev) =>
                              prev.includes(item.value as ImciDangerSign)
                                ? prev.filter((d) => d !== item.value)
                                : [...prev, item.value as ImciDangerSign],
                            );
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {t(item.key as any)}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("imciNoneOfThese")} — {imciDangerSigns.length === 0 ? "✓" : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("imciRespiratoryRate")}</Label>
                    <Input
                      value={imciRR}
                      onChange={(e) => setImciRR(e.target.value)}
                      type="number"
                      min={0}
                      max={200}
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("coughDays" as any) || "Days with cough"}</Label>
                    <Input
                      value={imciCoughDays}
                      onChange={(e) => setImciCoughDays(e.target.value)}
                      type="number"
                      min={0}
                      max={90}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("feverDays" as any) || "Days with fever"}</Label>
                    <Input
                      value={imciFeverDays}
                      onChange={(e) => setImciFeverDays(e.target.value)}
                      type="number"
                      min={0}
                      max={90}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={imciDiarrhoea}
                      onChange={(e) => setImciDiarrhoea(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {t("imciDiarrhoea")}
                  </label>
                  {imciDiarrhoea && (
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label>{t("imciDiarrhoeaDays")}</Label>
                        <Input
                          value={imciDiarrhoeaDays}
                          onChange={(e) => setImciDiarrhoeaDays(e.target.value)}
                          type="number"
                          min={0}
                          max={90}
                          placeholder="0"
                        />
                      </div>
                      {imciDiarrhoeaCheckboxes.map((item) => (
                        <label key={item.key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => item.setter(!item.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {t(item.i18nKey as any)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-2xl border bg-card p-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={imciOedema}
                      onChange={(e) => setImciOedema(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {t("imciOedema") || "Bilateral pitting oedema"}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={imciPallor}
                      onChange={(e) => setImciPallor(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    {t("imciPallor") || "Pallor"}
                  </label>
                </div>

                <Button onClick={runImciAssessment} size="lg" className="w-full gap-2">
                  {t("continue")} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "vitals" && age && (
          <VitalSignsInput
            ageYears={Number(age)}
            values={vitalSigns}
            onChange={setVitalSigns}
            onContinue={onVitalsComplete}
            onSkip={skipVitals}
          />
        )}

        {step === "nutrition" && age && (
          <NutritionAssessment
            ageYears={Number(age)}
            onComplete={onNutritionComplete}
            onSkip={skipNutrition}
          />
        )}

        {step === "symptoms" && (
          <SymptomChecklist
            checklist={getChecklistForPresentation(presentationType)}
            selected={symptoms}
            onChange={setSymptoms}
            onContinue={onSymptomsComplete}
            onSkip={skipSymptoms}
          />
        )}

        {step === "capture" && (
          <div className="mt-6 space-y-4">
            {presentationType !== "dermatology" && symptomDescription.trim() && (
              <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">{t("textOnlyMode")}</p>
                  <p className="mt-1 text-muted-foreground">{t("textOnlyDesc")}</p>
                  <Button onClick={onTextOnlyAnalyze} size="sm" className="mt-3 gap-2">
                    {t("analyzeSymptoms")} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-4">
              <ScanLine className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">{t("frameArea")}</p>
                <p className="mt-1 text-muted-foreground">{t("lightingDesc")}</p>
              </div>
            </div>
            <WebGPUCheck engineKind={engineKind} ollamaUrl={ollamaUrl} compact />
            <CameraCapture
              onCapture={onCapture}
              onSource={(s) => setImageSource(s)}
              onCancel={() => setStep("presentation")}
            />
          </div>
        )}

        {step === "quality" && qualityResult && (
          <div className="mt-6 space-y-5">
            {showEnhancement && enhancedImage && enhancementMeta?.applied && (
              <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <h3 className="text-center text-sm font-semibold">{t("enhanceImage")}</h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="mb-1 text-center text-xs text-muted-foreground">{t("before")}</p>
                    <img
                      src={image!}
                      alt="Original"
                      className="h-32 w-full rounded-xl object-cover ring-1 ring-border"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="mb-1 text-center text-xs text-muted-foreground">{t("after")}</p>
                    <img
                      src={enhancedImage}
                      alt="Enhanced"
                      className="h-32 w-full rounded-xl object-cover ring-2 ring-primary/40"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground">{t("useEnhanced")}:</span>
                  <Button
                    variant={enhanceEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEnhanceEnabled(true)}
                    className="text-xs"
                  >
                    {t("enhanced")}
                  </Button>
                  <Button
                    variant={!enhanceEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEnhanceEnabled(false)}
                    className="text-xs"
                  >
                    {t("original")}
                  </Button>
                </div>
              </div>
            )}
            {image && !(showEnhancement && enhancedImage && enhancementMeta?.applied) && (
              <img
                src={image}
                alt="Captured photo"
                className="mx-auto h-48 w-48 rounded-2xl object-cover ring-4 ring-primary/20"
              />
            )}
            {qualityResult.score < 60 ? (
              <div className="space-y-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
                <h3 className="text-lg font-semibold">{t("imageTooPoor")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("improveLightingOrDistance")}
                </p>
                {qualityResult.issues.length > 0 && (
                  <ul className="mx-auto max-w-xs space-y-1 text-left text-sm text-muted-foreground">
                    {qualityResult.issues.map((issue, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
                <Button onClick={() => setStep("capture")} className="mt-2 gap-2">
                  {t("retakePhoto")} <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-amber-400/40 bg-amber-50/50 p-5 text-center dark:bg-amber-950/20">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                <h3 className="text-lg font-semibold">{t("imageQualityWarn")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("qualityScore")}: {qualityResult.score}/100 ({getQualityLabel(qualityResult.score)})
                </p>
                {qualityResult.issues.length > 0 && (
                  <ul className="mx-auto max-w-xs space-y-1 text-left text-sm text-muted-foreground">
                    {qualityResult.issues.map((issue, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setStep("capture")} className="gap-2">
                    {t("retakePhoto")} <ScanLine className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => proceedWithAnalysis(enhanceEnabled && enhancedImage ? enhancedImage : image!)} className="gap-2">
                    {t("proceedAnyway")} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "analyzing" && (
          <div className="mt-10 flex flex-col items-center gap-5 text-center">
            {image && (
              <img
                src={image}
                alt="Captured wound or skin condition photo being analyzed by AI"
                className="h-40 w-40 rounded-2xl object-cover ring-4 ring-primary/20"
              />
            )}
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="w-full max-w-sm space-y-2">
              <p className="text-sm font-medium">{progressText || t("preparing") + "..."}</p>
              <Progress value={progress} />
              {engineKind === "cloud" ? (
                <CloudInferenceIndicator active />
              ) : (
                <p className="text-xs text-muted-foreground">{t("runningLocally")}</p>
              )}
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="mt-6 space-y-5">
            {enhancementMeta?.applied && (
              <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary">
                <Sun className="h-3.5 w-3.5" />
                {t("imageEnhanced")}
              </div>
            )}
            {image && result.visual_feature_regions && result.visual_feature_regions.length > 0 ? (
              <SaliencyOverlay imageUrl={enhanceEnabled && enhancedImage ? enhancedImage : image} regions={result.visual_feature_regions} />
            ) : image ? (
              <img
                src={enhanceEnabled && enhancedImage ? enhancedImage : image}
                alt="Captured wound or skin condition photo assessment result"
                className="aspect-video w-full rounded-2xl object-cover"
              />
            ) : null}
            {notifiableFlags.length > 0 && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-400/30 bg-red-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-700">{t("outbreakAlertTitle")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-700/80">
                    {t("outbreakAlertDesc")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {notifiableFlags.map((nf, i) => (
                      <li key={i} className="text-xs font-medium text-red-700">
                        {nf.condition} — {nf.matchedKeyword}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <AssessmentResult
              result={result}
              onSpeak={speak}
              minConfidenceForLocalCare={minConfidenceForLocalCare}
              engineKind={kindRef.current as "webllm" | "ollama" | "demo" | "cloud" | "auto"}
            />
            <AiFeedbackWidget
              onFeedback={(fb) => {
                aiFeedbackRef.current = fb;
              }}
              userId={user?.id || ""}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  if (image && window.confirm(t("retakeConfirm"))) setStep("capture");
                }}
              >
                <ScanLine className="h-4 w-4" /> {t("retakePhoto")}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => speak(result.recommendation)}
              >
                <Volume2 className="h-4 w-4" /> {t("read")}
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={startVoiceAssessment}>
                <MessageSquare className="h-4 w-4" /> {t("voiceFollowUp")}
              </Button>
              <Button onClick={save} className="flex-1 gap-2" size="lg">
                <Save className="h-4 w-4" /> {t("save")}
              </Button>
            </div>
          </div>
        )}

        {step === "voice" && (
          <div className="mt-6 space-y-5">
            <div className="rounded-3xl border bg-card p-6">
              <h3 className="font-display text-base font-semibold">{t("voiceFollowUp")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("voiceFollowUpDesc")}</p>

              {voiceHistory.length > 0 && (
                <div className="mt-4 space-y-2">
                  {voiceHistory.map((qa, i) => (
                    <div key={i} className="rounded-xl bg-secondary/30 p-3 text-sm">
                      <p className="font-medium">
                        <Volume2 className="mr-1 inline h-3 w-3 text-primary" />
                        {qa.question}
                      </p>
                      <p className="mt-1 text-muted-foreground">→ {qa.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 rounded-xl border bg-secondary/20 p-4">
                <p className="text-sm font-medium">
                  <Volume2 className="mr-1 inline h-4 w-4 text-primary" />
                  {currentQuestion || t("preparing") + "..."}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <Input
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typedAnswer.trim()) {
                      handleVoiceAnswer(typedAnswer);
                    }
                  }}
                  disabled={voiceBusy}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={recordVoiceAnswer}
                  disabled={voiceBusy}
                  title="Speak your answer"
                >
                  {voiceBusy ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => handleVoiceAnswer(typedAnswer)}
                  disabled={!typedAnswer.trim() || voiceBusy}
                >
                  {t("send")}
                </Button>
              </div>

              <div className="mt-4 flex justify-between">
                <p className="text-xs text-muted-foreground">
                  {voiceHistory.length} {t("of")} 5 {t("questionsAnswered")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => setStep("result")}
                >
                  {t("skipAndSave")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {voice.active && (
          <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              onClick={() => {
                if (voice.speaking) {
                  voice.stop();
                } else {
                  const txt = {
                    patient: `${t("voiceGuideWhoIsPatient")} ${t("voiceGuidePatientId")} ${t("voiceGuideAge")} ${t("voiceGuideSex")} ${t("voiceGuideConsent")}`,
                    presentation: `${t("presentationTypeTitle")}. ${t("presentationTypeDesc")}.`,
                    vitals: `${t("captureVitals")}. ${t("vitalsDesc")}.`,
                    nutrition: `${t("nutritionAssessment")}.`,
                    symptoms: `${t("symptomChecklist")}.`,
                    imci: `${t("imciPathway")}.`,
                    capture: t("voiceGuideCapture"),
                    quality: t("checkingQuality"),
                    analyzing: t("analyzing") + "...",
                    result: result
                      ? `${t("voiceGuideResult")}. ${t("likelyCondition")}: ${result.condition}. ${t(
                          "voiceGuideConfidence",
                        ).replace(
                          "{pct}",
                          String(
                            Math.round(
                              typeof result.confidence === "number"
                                ? result.confidence
                                : (result.confidence?.confidence_point ?? 0),
                            ),
                          ),
                        )}. ${t("voiceGuideUrgency").replace("{level}", result.urgency)}.`
                      : "",
                    voice: currentQuestion,
                  }[step];
                  if (txt) voice.narrate(txt);
                }
              }}
              title={voice.speaking ? "Stop" : "Guide me"}
            >
              {voice.speaking ? <MicOff className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function Stepper({
  step,
  progress,
  progressText,
  shouldShowCheckIn,
  handleWellBeingSkip,
  handleWellBeingSubmit,
}: {
  step: Step;
  progress?: number;
  progressText?: string;
  shouldShowCheckIn: boolean;
  handleWellBeingSkip: () => void;
  handleWellBeingSubmit: (responses: [number, number, number]) => void;
}) {
  const { t } = useI18n();

  const PHASES = [
    { key: "capture", icon: ScanLine },
    { key: "analyse", icon: Loader2 },
    { key: "interview", icon: MessageSquare },
    { key: "save", icon: Save },
  ] as const;

  const phaseForStep: Record<Step, number> = {
    patient: 0,
    presentation: 0,
    imci: 0,
    vitals: 0,
    nutrition: 0,
    symptoms: 0,
    capture: 0,
    quality: 0,
    analyzing: 1,
    result: 2,
    voice: 2,
  };

  const currentPhase = phaseForStep[step] ?? 0;

  return (
    <nav aria-label={t("progress")} className="w-full">
      <div className="flex items-center justify-between gap-2">
        {PHASES.map((phase, i) => {
          const isComplete = i < currentPhase;
          const isCurrent = i === currentPhase;
          const Icon = phase.icon;

          return (
            <div key={phase.key} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  role="status"
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`${t("step")} ${i + 1} ${t(phase.key)}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`hidden whitespace-nowrap text-[10px] font-medium leading-tight sm:block ${
                    isCurrent
                      ? "text-foreground"
                      : isComplete
                        ? "text-muted-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {t(phase.key)}
                </span>
              </div>

              {/* Progress bar connecting phases */}
              {i < PHASES.length - 1 && (
                <div className="flex-1 px-1">
                  {isCurrent && step === "analyzing" && progress !== undefined ? (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  ) : (
                    <div
                      className={`h-1 rounded-full transition-colors ${
                        isComplete ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {step === "analyzing" && progressText && (
        <p className="mt-2 text-center text-xs text-muted-foreground">{progressText}</p>
      )}
      <WellBeingCheckIn
        isOpen={shouldShowCheckIn}
        onClose={handleWellBeingSkip}
        onSubmit={handleWellBeingSubmit}
        onSkip={handleWellBeingSkip}
      />
    </nav>
  );
}
