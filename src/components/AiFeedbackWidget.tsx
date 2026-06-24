import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Minus, Check, Loader2, Mic } from "lucide-react";
import type { AiFeedbackRating, AiFeedback } from "@/types/trij";

interface Props {
  onFeedback: (feedback: AiFeedback) => void;
  userId: string;
  voice?: {
    active: boolean;
    listening: boolean;
    ask: (prompt: string, timeoutMs?: number) => Promise<string | null>;
    confirm: (prompt: string) => Promise<boolean>;
  };
}

const CONDITIONS = [
  "Malaria",
  "Acute respiratory infection",
  "Diarrhoeal disease",
  "Hypertension",
  "Diabetes mellitus",
  "Wound infection",
  "Skin infection / rash",
  "Malnutrition",
  "Anaemia",
  "Urinary tract infection",
  "Typhoid fever",
  "Dengue fever",
  "Tuberculosis",
  "HIV-related illness",
  "Other",
];

export function AiFeedbackWidget({ onFeedback, userId, voice }: Props) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<AiFeedbackRating | null>(null);
  const [actualCondition, setActualCondition] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showCondition, setShowCondition] = useState(false);

  const handleRating = (rating: AiFeedbackRating) => {
    setSelected(rating);
    if (rating === "correct") {
      submit(rating);
    } else {
      setShowCondition(true);
    }
  };

  const submit = (rating: AiFeedbackRating) => {
    setSubmitted(true);
    onFeedback({
      rating,
      actualCondition: rating !== "correct" ? actualCondition : undefined,
      ratedBy: userId,
      ratedAt: new Date().toISOString(),
    });
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        <Check className="h-4 w-4" />
        {t("feedbackThankYou")}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{t("feedbackPrompt")}</p>
        {voice?.active && (
          <Button
            variant="outline"
            size="icon"
            onClick={async () => {
              const correct = await voice.confirm("Was the diagnosis correct? Say yes or no");
              if (correct) {
                handleRating("correct");
              } else {
                setShowCondition(true);
                setSelected("incorrect");
                const condition = await voice.ask("What was the actual diagnosis?");
                if (condition) setActualCondition(condition.trim());
              }
            }}
            disabled={voice.listening}
          >
            <Mic className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        <Button
          variant={selected === "correct" ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => handleRating("correct")}
        >
          <ThumbsUp className="h-4 w-4" /> {t("correct")}
        </Button>
        <Button
          variant={selected === "partial" ? "secondary" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => handleRating("partial")}
        >
          <Minus className="h-4 w-4" /> {t("partial")}
        </Button>
        <Button
          variant={selected === "incorrect" ? "destructive" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => handleRating("incorrect")}
        >
          <ThumbsDown className="h-4 w-4" /> {t("incorrect")}
        </Button>
      </div>

      {showCondition && (
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              {t("actualDiagnosis")}
            </label>
            <select
              value={actualCondition}
              onChange={(e) => setActualCondition(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("selectCondition")}</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={() => submit(selected!)}
            disabled={!actualCondition}
            className="gap-2"
          >
            <Check className="h-4 w-4" /> {t("submitFeedback")}
          </Button>
        </div>
      )}
    </div>
  );
}
