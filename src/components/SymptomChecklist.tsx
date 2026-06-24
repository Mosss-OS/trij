import { useState } from "react";
import type { SystemChecklist } from "@/lib/symptom-checklists";
import { Button } from "@/components/ui/button";
import { ChevronRight, ClipboardList, Mic } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  checklist: SystemChecklist;
  selected: string[];
  onChange: (ids: string[]) => void;
  onContinue: () => void;
  onSkip: () => void;
  voice?: {
    active: boolean;
    listening: boolean;
    ask: (prompt: string, timeoutMs?: number) => Promise<string | null>;
  };
}

export function SymptomChecklist({ checklist, selected, onChange, onContinue, onSkip, voice }: Props) {
  const { t } = useI18n();
  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold">
              {t("symptomChecklist")}: {checklist.label}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">{t("symptomChecklistDesc")}</p>
          </div>
          {voice?.active && (
            <Button
              variant="outline"
              size="icon"
              onClick={async () => {
                const val = await voice.ask("Say a symptom name to toggle it");
                if (val) {
                  const lower = val.toLowerCase();
                  const match = checklist.items.find(
                    (item) =>
                      item.label.toLowerCase().includes(lower) ||
                      lower.includes(item.label.toLowerCase()),
                  );
                  if (match) toggle(match.id);
                }
              }}
              disabled={voice.listening}
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {checklist.items.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent ${
                selected.includes(item.id)
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 rounded border-border"
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          {t("symptomsSelected")}: {selected.length}/{checklist.items.length}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onContinue} size="sm" className="gap-1.5">
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
