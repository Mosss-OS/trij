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
import type { TriageResult, Patient, Assessment } from "@/types/trij";
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

interface QAPair {
  question: string;
  answer: string;
}

export const Route = createFileRoute("/_app/triage")({
  head: () => ({
    meta: [
      {
        title: "New Triage — AI Wound & Rash Assessment | Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Perform a free AI-assisted medical triage assessment. Capture a photo of a wound, rash, or skin condition and get instant urgency classification (Green/Yellow/Red) with confidence scoring — all on-device, no internet required.",
      },
      {
        name: "keywords",
        content:
          "wound assessment AI, rash analysis app, skin condition triage, free medical assessment, on-device triage, community health assessment, wound care app, dermatology AI",
      },
      {
        property: "og:title",
        content: "New Triage — AI Wound & Rash Assessment | Trij",
      },
      {
        property: "og:description",
        content:
          "Free AI-powered wound and rash assessment. Snap a photo, get instant urgency level and treatment recommendation — all offline.",
      },
      {
        name: "twitter:title",
        content: "New Triage — AI Wound & Rash Assessment | Trij",
      },
      {
        name: "twitter:description",
        content:
          "Free AI-powered wound and rash assessment. Snap a photo, get instant urgency level and treatment recommendation — all offline.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="triage">
      <TriagePage />
    </I18nErrorBoundary>
  ),
});

type Step = "patient" | "capture" | "analyzing" | "result" | "voice";

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
          console.error("WebLLM load failed, falling back to demo", err);
          toast.error(t("inferenceFailed") + ": WebGPU issues. Using demo mode.");
          kind = "demo";
          kindRef.current = "demo";
        }
      }

      setProgressText(t("analyzing") + "...");
      setProgress(100);
      const r = await triageImage(dataUrl, language, kind, ollamaUrl);
      setResult(r);
      setStep("result");
    } catch (err) {
      toast.error(t("inferenceFailed") + ": " + (err as Error).message);
      setStep("capture");
    }
  };

  const save = async () => {
    if (!user || !patient || !result || !image) return;
    voice.narrate(t("voiceGuideSaving"));
    const a: Assessment = {
      id: crypto.randomUUID(),
      patientId: patient.id,
      chwUserId: user.id,
      images: [image],
      condition: result.condition,
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
      <AppHeader title={t("newTriage")} subtitle={t("stepByStep")} />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <Stepper step={step} />

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

        {step === "capture" && (
          <div className="mt-6 space-y-4">
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
              onCancel={() => setStep("patient")}
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

function Stepper({ step }: { step: Step }) {
  const stages: Step[] = ["patient", "capture", "analyzing", "result", "voice"];
  const idx = stages.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {stages.map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i <= idx ? "bg-primary" : "bg-muted"}`}
        />
      ))}
    </div>
  );
}
