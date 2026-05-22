import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { Heart, X } from "lucide-react";
import type { WellBeingCheckIn } from "@/types/trij";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (responses: [number, number, number]) => void;
  onSkip: () => void;
}

// WHO-5 adapted questions for CHW context (3 questions instead of 5 for brevity)
const QUESTIONS = [
  "wellBeingQuestion1", // "I have felt cheerful and in good spirits"
  "wellBeingQuestion2", // "I have felt calm and relaxed"
  "wellBeingQuestion3", // "I have felt active and vigorous"
];

export function WellBeingCheckIn({ isOpen, onClose, onSubmit, onSkip }: Props) {
  const { t } = useI18n();
  const [responses, setResponses] = useState<[number, number, number]>([3, 3, 3]); // Default to neutral

  const handleResponseChange = (questionIndex: number, value: number) => {
    const newResponses = [...responses] as [number, number, number];
    newResponses[questionIndex] = value;
    setResponses(newResponses);
  };

  const handleSubmit = () => {
    onSubmit(responses);
    setResponses([3, 3, 3]); // Reset for next time
    onClose();
  };

  const handleSkip = () => {
    onSkip();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <DialogTitle>{t("wellBeingCheckIn")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("wellBeingCheckInDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {QUESTIONS.map((key, index) => (
            <div key={key} className="space-y-2">
              <p className="text-sm font-medium">{t(key)}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleResponseChange(index, value)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                      responses[index] === value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("wellBeingScaleLow")}</span>
                <span>{t("wellBeingScaleHigh")}</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            <X className="mr-2 h-4 w-4" />
            {t("skipCheckIn")}
          </Button>
          <Button onClick={handleSubmit} className="w-full sm:w-auto">
            {t("submitCheckIn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}