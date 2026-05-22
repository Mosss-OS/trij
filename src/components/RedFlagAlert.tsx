import { AlertTriangle, X, MapPin, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RedFlag } from "@/lib/red-flags";
import { useI18n } from "@/lib/i18n";

interface Props {
  flags: RedFlag[];
  onDismiss: () => void;
  onProceedToResult: () => void;
}

export function RedFlagAlert({ flags, onDismiss, onProceedToResult }: Props) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border-2 border-red-500 bg-white shadow-2xl">
        <div className="rounded-t-3xl bg-red-600 p-6 text-center text-white">
          <AlertTriangle className="mx-auto h-12 w-12 animate-pulse" />
          <h2 className="mt-3 font-display text-xl font-bold">{t("emergencyAlert")}</h2>
          <p className="mt-1 text-sm text-red-100">{t("redFlagDetected")}</p>
        </div>

        <div className="space-y-4 p-6">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="rounded-2xl border border-red-200 bg-red-50 p-4"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-red-900">{flag.title}</h3>
                  <p className="mt-1 text-xs font-medium text-red-700">
                    {t("suspected")}: {flag.suspectedCondition}
                  </p>
                  <p className="mt-1 text-xs text-red-600/80">{flag.description}</p>
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-100/80 p-3">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                    <p className="text-xs font-medium text-red-800">{flag.action}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            {t("redFlagUrgencyOverride")}
          </div>
        </div>

        <div className="flex gap-3 border-t p-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onDismiss}
          >
            <X className="mr-1.5 h-4 w-4" />
            {t("dismiss")}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onProceedToResult}
          >
            {t("viewAssessmentAnyway")}
          </Button>
        </div>
      </div>
    </div>
  );
}
