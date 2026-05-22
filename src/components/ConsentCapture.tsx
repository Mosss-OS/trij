import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Fingerprint, PenLine, Mic } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ConsentRecord } from "@/types/trij";

const CONSENT_POLICY_VERSION = 1;

interface ConsentItem {
  id: string;
  key: string;
}

const CONSENT_ITEMS: ConsentItem[] = [
  { id: "data_collected", key: "consentItemData" },
  { id: "data_usage", key: "consentItemUsage" },
  { id: "data_sharing", key: "consentItemSharing" },
  { id: "right_to_withdraw", key: "consentItemWithdraw" },
];

type ConsentMethod = "verbal" | "thumbprint" | "signature" | "voice";

interface ConsentCaptureProps {
  onConsent: (record: ConsentRecord) => void;
  disabled?: boolean;
}

export function ConsentCapture({ onConsent, disabled }: ConsentCaptureProps) {
  const { t } = useI18n();
  const [agreed, setAgreed] = useState<Record<string, boolean>>(
    Object.fromEntries(CONSENT_ITEMS.map((item) => [item.id, false])),
  );
  const [method, setMethod] = useState<ConsentMethod>("verbal");
  const [confirmed, setConfirmed] = useState(false);

  const allAgreed = CONSENT_ITEMS.every((item) => agreed[item.id]);

  const handleToggle = (id: string) => {
    setAgreed((prev) => ({ ...prev, [id]: !prev[id] }));
    setConfirmed(false);
  };

  const handleConfirm = () => {
    const record: ConsentRecord = {
      version: 1,
      method,
      capturedAt: new Date().toISOString(),
      capturedBy: "",
      items: CONSENT_ITEMS.map((item) => ({
        id: item.id,
        agreed: agreed[item.id],
      })),
      policyVersion: CONSENT_POLICY_VERSION,
    };
    setConfirmed(true);
    onConsent(record);
  };

  const methodIcons: Record<ConsentMethod, typeof Fingerprint> = {
    verbal: Mic,
    thumbprint: Fingerprint,
    signature: PenLine,
    voice: Mic,
  };

  const MethodIcon = methodIcons[method];

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h3 className="font-display text-base font-semibold">{t("consentTitle")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t("consentSubtitle")}</p>
      </div>

      <div className="space-y-3">
        {CONSENT_ITEMS.map((item) => (
          <label
            key={item.id}
            className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
              agreed[item.id]
                ? "border-green-300 bg-green-50"
                : "border-muted bg-transparent"
            }`}
          >
            <Checkbox
              checked={agreed[item.id]}
              onCheckedChange={() => handleToggle(item.id)}
              disabled={disabled || confirmed}
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              {t(item.key as any)}
            </span>
          </label>
        ))}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">{t("consentMethod")}</Label>
        <div className="mt-1.5 flex gap-2">
          {(["verbal", "thumbprint", "signature", "voice"] as ConsentMethod[]).map((m) => {
            const icons = { verbal: Mic, thumbprint: Fingerprint, signature: PenLine, voice: Mic };
            const Icon = icons[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                disabled={disabled || confirmed}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                  method === m
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(m as any)}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleConfirm}
        disabled={disabled || !allAgreed || confirmed}
        size="sm"
        className="w-full gap-2"
        variant={confirmed ? "outline" : "default"}
      >
        {confirmed ? (
          <>
            <Check className="h-4 w-4" /> {t("consentConfirmed")}
          </>
        ) : (
          <>{t("consentConfirm")}</>
        )}
      </Button>
    </div>
  );
}
