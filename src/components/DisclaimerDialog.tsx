import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settingsStore";

export function DisclaimerDialog({ voice }: { voice?: { active: boolean; listening: boolean; confirm: (prompt: string) => Promise<boolean> } }) {
  const { t } = useI18n();
  const acceptDisclaimer = useSettingsStore((s) => s.acceptDisclaimer);
  const chwName = useSettingsStore((s) => s.chwName);
  const [name, setName] = useState(chwName);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur-sm sm:items-center">
      <div className="mx-auto my-auto max-w-lg space-y-6 rounded-3xl border bg-card p-5 shadow-2xl sm:p-8 sm:my-0">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-urgency-yellow/20">
            <ShieldAlert className="h-6 w-6 text-urgency-yellow" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">{t("disclaimerTitle")}</h1>
            <p className="text-xs text-muted-foreground">{t("disclaimerSubtitle")}</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-secondary/30 p-5 text-sm leading-relaxed">
          <p className="font-semibold">{t("disclaimerLead")}</p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>{t("disclaimerItem1")}</li>
            <li>{t("disclaimerItem2")}</li>
            <li>{t("disclaimerItem3")}</li>
            <li>{t("disclaimerItem4")}</li>
            <li>{t("disclaimerItem5")}</li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="chw-name">{t("chwNameLabel")}</Label>
            <Input
              id="chw-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border bg-secondary/20 p-4">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              disabled={!name.trim()}
            />
            <span className="text-xs leading-relaxed text-muted-foreground">{t("disclaimerAgreeText")}</span>
          </label>
        </div>

          {voice?.active && !agreed && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={async () => {
                const ok = await voice.confirm(t("disclaimerVoiceConfirm"));
                if (ok) setAgreed(true);
              }}
              disabled={voice.listening}
            >
              <Mic className="h-4 w-4" /> {t("voiceGuide")}
            </Button>
          )}
          <Button
          className="w-full"
          size="lg"
          disabled={!name.trim() || !agreed}
          onClick={() => {
            acceptDisclaimer(name.trim());
            setSubmitted(true);
          }}
        >
          {t("disclaimerAccept")}
        </Button>
      </div>
    </div>
  );
}
