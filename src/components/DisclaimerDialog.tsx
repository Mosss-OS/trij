import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";

export function DisclaimerDialog() {
  const acceptDisclaimer = useSettingsStore((s) => s.acceptDisclaimer);
  const chwName = useSettingsStore((s) => s.chwName);
  const [name, setName] = useState(chwName);
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-lg space-y-6 rounded-3xl border bg-card p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-urgency-yellow/20">
            <ShieldAlert className="h-6 w-6 text-urgency-yellow" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold">Important notice</h1>
            <p className="text-xs text-muted-foreground">Before you begin using Trij</p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-secondary/30 p-5 text-sm leading-relaxed">
          <p className="font-semibold">
            Trij is an AI-assisted tool, not a clinical diagnostic device.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              All assessments are <strong>preliminary</strong> and must be verified with clinical
              judgment.
            </li>
            <li>
              Trij does <strong>not</strong> replace professional medical evaluation.
            </li>
            <li>
              Always refer patients to a clinic or hospital when in doubt or when the assessment
              indicates urgency.
            </li>
            <li>
              Patient data is stored on-device and only synced to your authorized backend when
              connectivity is available.
            </li>
            <li>You are responsible for complying with local health data privacy regulations.</li>
          </ul>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="chw-name">Your name (CHW)</Label>
            <Input
              id="chw-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A. Patel"
            />
          </div>

          <label className="flex items-start gap-3 rounded-xl border bg-secondary/20 p-4">
            <Checkbox
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
              disabled={!name.trim()}
            />
            <span className="text-xs leading-relaxed text-muted-foreground">
              I understand and agree that Trij provides AI-assisted preliminary assessments only. I
              will use clinical judgment for all patient care decisions. I have read and understand
              the above notice.
            </span>
          </label>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!name.trim() || !agreed}
          onClick={() => {
            acceptDisclaimer(name.trim());
            setSubmitted(true);
          }}
        >
          I understand — begin using Trij
        </Button>
      </div>
    </div>
  );
}
