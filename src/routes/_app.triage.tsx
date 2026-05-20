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
} from "lucide-react";
import {
  triageImage,
  detectEngine,
  isLoaded,
  loadEngine,
  initVoiceConversation,
  nextVoiceTurn,
  type ConvMessage,
} from "@/lib/gemma";
import { WebGPUCheck } from "@/components/WebGPUCheck";
import type { TriageResult, Patient, Assessment, VitalSigns } from "@/types/trij";
import { getDB } from "@/lib/db";
import { queuePatient, queueAssessment } from "@/lib/sync";
import { saveVoiceDraft, getVoiceDraft, clearVoiceDraft, listVoiceDrafts } from "@/lib/voice-draft";
import { getCurrentPosition } from "@/lib/geolocation";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { VoiceAssistant } from "@/lib/voice";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useVoiceGuidance } from "@/hooks/useVoiceGuidance";
import { CloudInferenceIndicator } from "@/components/CloudInferenceIndicator";
import { AiFailureOverlay, classifyAiError } from "@/components/AiFailureOverlay";
import type { AiFailureKind } from "@/components/AiFailureOverlay";

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

type Step = "patient" | "presentation" | "vitals" | "capture" | "analyzing" | "result" | "voice";

function TriagePage() {
  const { t } = useI18n();
  const user = useSessionStore((s) => s.user);
  const language = useSettingsStore((s) => s.language);
  const engineKind = useSettingsStore((s) => s.engineKind);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const minConfidenceForLocalCare = useSettingsStore((s) => s.minConfidenceForLocalCare);
  const voiceEnabled = useSettingsStore((s) => s.voiceEnabled);
  const voiceTestMode = useSettingsStore((s) => s.voiceTestMode);
  const navigate = useNavigate();
  const voice = useVoiceGuidance();
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
  const [image, setImage] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"camera" | "gallery">("camera");
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<TriageResult | null>(null);
  const [voiceHistory, setVoiceHistory] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const voiceRef = useRef<VoiceAssistant | null>(null);
  const kindRef = useRef<string>("demo");
  const convoRef = useRef<ConvMessage[]>([]);
  const [aiFailureKind, setAiFailureKind] = useState<AiFailureKind | null>(null);
  const [pendingCapture, setPendingCapture] = useState<string | null>(null);
  const pendingTextRef = useRef(false);

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
            t("voiceGuideConfidence").replace("{pct}", String(Math.round(result.confidence))),
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

  const persistDraft = async (
    p: Patient,
    res: TriageResult,
    img: string,
    qa: QAPair[],
    currentQ: string,
    msgs: ConvMessage[],
    consentVal: boolean,
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
        consent: consentVal,
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
    setConsent(draft.consent);
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
    setPatient(p);
    setStep("presentation");
  };

  const onVitalsComplete = () => {
    setStep("capture");
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
    setStep("capture");
  };

  const onCapture = async (dataUrl: string) => {
    setImage(dataUrl);
    setStep("analyzing");
    try {
      let kind = engineKind === "auto" ? await detectEngine() : engineKind;
      kindRef.current = kind;

      if (kind === "webllm" && !isLoaded(kind)) {
        try {
          await loadEngine(kind, (r) => {
            setProgress(Math.round((r.progress || 0) * 100));
            setProgressText(r.text || t("preparing") + "...");
          });
        } catch (err) {
          console.error("WebLLM load failed", err);
          setAiFailureKind("model_not_ready");
          setPendingCapture(dataUrl);
          setStep("capture");
          return;
        }
      }

      setProgressText(t("analyzing") + "...");
      setProgress(100);
      const r = await triageImage(dataUrl, language, kind, ollamaUrl, presentationType, symptomDescription);
      setResult(r);
      setStep("result");
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

      if (kind === "webllm" && !isLoaded(kind)) {
        try {
          await loadEngine(kind, (r) => {
            setProgress(Math.round((r.progress || 0) * 100));
            setProgressText(r.text || t("preparing") + "...");
          });
        } catch (err) {
          console.error("WebLLM load failed", err);
          setAiFailureKind("model_not_ready");
          setPendingCapture("");
          setStep("capture");
          return;
        }
      }

      setProgressText(t("analyzing") + "...");
      setProgress(100);
      /* Pass an empty placeholder image — the model will rely on symptom description */
      const r = await triageImage("", language, kind, ollamaUrl, presentationType, symptomDescription);
      setResult(r);
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
      oxygenSaturation: vitalSigns.oxygenSaturation ? Number(vitalSigns.oxygenSaturation) : undefined,
      muac: vitalSigns.muac ? Number(vitalSigns.muac) : undefined,
      weight: vitalSigns.weight ? Number(vitalSigns.weight) : undefined,
      painScale: vitalSigns.painScale ? Number(vitalSigns.painScale) : undefined,
    };
    /* Only include vitals if at least one field has a value */
    const hasAny = Object.values(parsed).some((v) => v !== undefined);
    return hasAny ? (parsed as VitalSigns) : undefined;
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
      presentationType: presentationType !== "dermatology" ? (presentationType as import("@/types/trij").PresentationType) : undefined,
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
      patientConsent: consent,
      consentTimestamp: new Date().toISOString(),
      voiceLog:
        voiceHistory.length > 0
          ? voiceHistory.map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`).join("\n")
          : undefined,
      language,
      imageSource,
      version: 0,
      createdAt: new Date().toISOString(),
    };
    await queueAssessment(a);
    await clearVoiceDraft(patient.id).catch(() => {});
    voice.narrate(t("voiceGuideSaved"));
    toast.success(t("savedOffline"));
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
        kindRef.current as "webllm" | "ollama" | "demo",
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
        kindRef.current as "webllm" | "ollama" | "demo",
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
                const r = await triageImage(data || "", language, "demo", ollamaUrl, presentationType, symptomDescription);
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
      <AppHeader title={t("newTriage")} subtitle={t("stepByStep")} />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <Stepper step={step} progress={progress} progressText={progressText} />

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
            <label className="flex items-start gap-3 rounded-xl border bg-secondary/20 p-4">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
              <span className="text-xs leading-relaxed text-muted-foreground">
                {t("consentDesc")}
              </span>
            </label>
            {voice.active && !consent && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={async () => {
                  const ok = await voice.confirm(t("voiceGuideConsent"));
                  if (ok) {
                    setConsent(true);
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
              {([
                ["dermatology", t("dermatologyIcon") || "Skin"],
                ["respiratory", t("respiratoryIcon") || "Lungs"],
                ["fever", t("feverIcon") || "Fever"],
                ["gastrointestinal", t("giIcon") || "Stomach"],
                ["neurological", t("neuroIcon") || "Brain"],
                ["malnutrition", t("malnutritionIcon") || "Nutrition"],
                ["eye_ear", t("eyeEarIcon") || "Eye/Ear"],
                ["musculoskeletal", t("mskIcon") || "Joint"],
              ] as const).map(([value, label]) => (
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

        {step === "vitals" && (
          <div className="mt-7 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold">{t("captureVitals")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("vitalsDesc")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>{t("bp")}</Label>
                <div className="flex gap-1">
                  <Input
                    value={vitalSigns.systolicBP}
                    onChange={(e) => setVitalSigns((v) => ({ ...v, systolicBP: e.target.value }))}
                    placeholder="120"
                    type="number"
                    min={0}
                    max={300}
                    className="w-full"
                  />
                  <span className="flex items-center text-xs text-muted-foreground">/</span>
                  <Input
                    value={vitalSigns.diastolicBP}
                    onChange={(e) => setVitalSigns((v) => ({ ...v, diastolicBP: e.target.value }))}
                    placeholder="80"
                    type="number"
                    min={0}
                    max={200}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("heartRate")}</Label>
                <Input
                  value={vitalSigns.heartRate}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, heartRate: e.target.value }))}
                  placeholder={t("hrPlaceholder")}
                  type="number"
                  min={0}
                  max={300}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("respiratoryRate")}</Label>
                <Input
                  value={vitalSigns.respiratoryRate}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, respiratoryRate: e.target.value }))}
                  placeholder={t("rrPlaceholder")}
                  type="number"
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("temperature")}</Label>
                <Input
                  value={vitalSigns.temperature}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, temperature: e.target.value }))}
                  placeholder={t("tempPlaceholder")}
                  type="number"
                  min={30}
                  max={45}
                  step={0.1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("oxygenSaturation")}</Label>
                <Input
                  value={vitalSigns.oxygenSaturation}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, oxygenSaturation: e.target.value }))}
                  placeholder={t("spo2Placeholder")}
                  type="number"
                  min={0}
                  max={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("muac")}</Label>
                <Input
                  value={vitalSigns.muac}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, muac: e.target.value }))}
                  placeholder={t("muacPlaceholder")}
                  type="number"
                  min={0}
                  max={60}
                  step={0.1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("weight")}</Label>
                <Input
                  value={vitalSigns.weight}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, weight: e.target.value }))}
                  placeholder={t("weightPlaceholder")}
                  type="number"
                  min={0}
                  max={300}
                  step={0.1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("painScale")}</Label>
                <Input
                  value={vitalSigns.painScale}
                  onChange={(e) => setVitalSigns((v) => ({ ...v, painScale: e.target.value }))}
                  placeholder="0-10"
                  type="number"
                  min={0}
                  max={10}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={onVitalsComplete} size="lg" className="flex-1 gap-2">
                {t("continue")} <ChevronRight className="h-4 w-4" />
              </Button>
              <Button onClick={skipVitals} size="lg" variant="ghost" className="gap-2">
                {t("vitalsUnknown")}
              </Button>
            </div>
          </div>
        )}

        {step === "capture" && (
          <div className="mt-6 space-y-4">
            {presentationType !== "dermatology" && symptomDescription.trim() && (
              <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">{t("textOnlyMode")}</p>
                  <p className="mt-1 text-muted-foreground">{t("textOnlyDesc")}</p>
                  <Button
                    onClick={onTextOnlyAnalyze}
                    size="sm"
                    className="mt-3 gap-2"
                  >
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
            {image && (
              <img
                src={image}
                alt="Captured wound or skin condition photo assessment result"
                className="aspect-video w-full rounded-2xl object-cover"
              />
            )}
            <AssessmentResult
              result={result}
              onSpeak={speak}
              minConfidenceForLocalCare={minConfidenceForLocalCare}
              engineKind={kindRef.current as "webllm" | "ollama" | "demo" | "cloud" | "auto"}
            />
            <div className="flex flex-wrap gap-3">
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
                    capture: t("voiceGuideCapture"),
                    analyzing: t("analyzing") + "...",
                    result: result
                      ? `${t("voiceGuideResult")}. ${t("likelyCondition")}: ${result.condition}. ${t("voiceGuideConfidence").replace("{pct}", String(Math.round(result.confidence)))}. ${t("voiceGuideUrgency").replace("{level}", result.urgency)}.`
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

function Stepper({ step, progress, progressText }: { step: Step; progress?: number; progressText?: string }) {
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
    vitals: 0,
    capture: 0,
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
                    isCurrent ? "text-foreground" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50"
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
    </nav>
  );
}
