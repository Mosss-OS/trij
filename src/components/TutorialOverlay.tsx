import { useState, useEffect } from "react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSessionStore } from "@/stores/sessionStore";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  Camera,
  Brain,
  Mic,
  Save,
  ArrowRight,
  ChevronRight,
  ArrowLeft,
  Stethoscope,
  CheckCircle2,
  SkipForward,
} from "lucide-react";

interface TutorialStep {
  icon: typeof Camera;
  title: string;
  description: string;
  actionLabel: string;
}

const steps: TutorialStep[] = [
  {
    icon: Camera,
    title: "Take a Sample Photo",
    description:
      "Trij uses your phone's camera to capture wounds, rashes, or skin conditions. Let's practice with a sample image.",
    actionLabel: "View Sample Photo",
  },
  {
    icon: Brain,
    title: "AI Assessment",
    description:
      "The AI analyzes the image locally on your device — no data leaves your phone. It returns a condition, confidence score, and urgency level.",
    actionLabel: "See Sample Result",
  },
  {
    icon: Mic,
    title: "Voice Follow-Up",
    description:
      "After the initial assessment, Trij asks targeted follow-up questions via voice. You can answer by speaking or typing.",
    actionLabel: "Try Voice Step",
  },
  {
    icon: Save,
    title: "Save & Sync",
    description:
      "Assessments are saved offline and sync automatically when you reconnect. Your supervisor can review them on the dashboard.",
    actionLabel: "Complete Setup",
  },
];

export function TutorialOverlay({ onComplete }: { onComplete?: () => void }) {
  const { t } = useI18n();
  const completeTutorial = useSettingsStore((s) => s.completeTutorial);
  const skipTutorial = useSettingsStore((s) => s.skipTutorial);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSample, setShowSample] = useState(false);
  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setShowSample(false);
    } else {
      completeTutorial();
      onComplete?.();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setShowSample(false);
    }
  };

  const handleSkip = () => {
    skipTutorial();
    onComplete?.();
  };

  const handleAction = () => {
    setShowSample(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center">
      <div className="mx-4 w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl sm:mx-0">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= currentStep ? "bg-primary" : "bg-muted"
                }`}
                style={{ width: 48 }}
              />
            ))}
          </div>
          <button
            onClick={handleSkip}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="h-3 w-3" /> Skip
          </button>
        </div>

        {/* Step content */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <step.icon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mb-2 font-display text-lg font-bold">{step.title}</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            {step.description}
          </p>

          {showSample && currentStep === 0 && (
            <div className="mb-6 w-full">
              <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-muted">
                <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-primary/5 to-primary/20">
                  <Camera className="h-12 w-12 text-primary/40" />
                </div>
              </div>
            </div>
          )}

          {showSample && currentStep === 1 && (
            <div className="mb-6 w-full space-y-3 rounded-2xl border bg-card p-4 text-left">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Sample Result
                </p>
                <span className="rounded-full bg-urgency-yellow/20 px-2.5 py-0.5 text-xs font-medium text-urgency-yellow">
                  Yellow
                </span>
              </div>
              <p className="text-lg font-bold">Suspected dermatitis</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-medium text-emerald-600">78%</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Keep the area clean and dry. Apply a mild moisturizer. Monitor for
                signs of infection.
              </p>
            </div>
          )}

          {showSample && currentStep === 2 && (
            <div className="mb-6 w-full space-y-3 rounded-2xl border bg-card p-4 text-left">
              <div className="flex items-center gap-2 text-primary">
                <Mic className="h-4 w-4" />
                <p className="text-sm font-medium">Sample Question</p>
              </div>
              <p className="text-base">
                "How long has the rash been present on the skin?"
              </p>
            </div>
          )}

          {showSample && currentStep === 3 && (
            <div className="mb-6 w-full space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-800 dark:bg-emerald-950">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">All Set!</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Your assessment is saved locally. It will sync to the supervisor
                dashboard when you are back online.
              </p>
            </div>
          )}

          {!showSample ? (
            <Button onClick={handleAction} size="lg" className="w-full gap-2">
              {step.actionLabel} <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex w-full gap-3">
              {currentStep > 0 && (
                <Button
                  onClick={handlePrev}
                  variant="ghost"
                  size="lg"
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                size="lg"
                className="flex-1 gap-2"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Finish
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
