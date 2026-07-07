import { AlertTriangle, Phone, MapPin, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RedFlagResult } from "@/lib/red-flags";
import { useI18n } from "@/lib/i18n";

interface Props {
  redFlagResult: RedFlagResult;
  onDismiss?: () => void;
  onContinueToFacility?: () => void;
}

export function RedFlagAlert({ redFlagResult, onDismiss, onContinueToFacility }: Props) {
  const { t } = useI18n();

  if (!redFlagResult.detected) return null;

  const criticalFlags = redFlagResult.flags.filter(f => f.rule.severity === "critical");
  const primaryFlag = criticalFlags.length > 0 ? criticalFlags[0].rule : redFlagResult.flags[0].rule;
  const timestamp = redFlagResult.flags[0].timestamp;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-lg bg-gradient-to-br from-red-50 to-orange-50 border-4 border-red-600 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-white animate-pulse" />
            <h1 className="text-2xl font-bold text-white">{t("emergencyAlert")}</h1>
          </div>
          <button
            onClick={onDismiss}
            className="text-white hover:text-red-200 transition-colors"
            aria-label={t("dismissAlert")}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Condition */}
          <div className="bg-red-100 border-2 border-red-500 rounded-xl p-4">
            <h2 className="text-lg font-bold text-red-800 mb-2">{primaryFlag.name}</h2>
            <p className="text-red-700 text-sm">{primaryFlag.description}</p>
          </div>

          {/* Immediate Action */}
          <div className="bg-orange-100 border-2 border-orange-500 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Phone className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-800 mb-1">{t("immediateActionRequired")}</h3>
                <p className="text-orange-700 text-sm leading-relaxed">{primaryFlag.immediateAction}</p>
              </div>
            </div>
          </div>

          {/* Additional Flags */}
          {redFlagResult.flags.length > 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-800 mb-2">{t("additionalRedFlagsDetected")}</h3>
              <ul className="space-y-1">
                {redFlagResult.flags.slice(1).map((flag, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    <span className="font-semibold">{flag.rule.name}</span> - {flag.rule.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Facility Info */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 mb-1">{t("nearestFacility")}</h3>
                <p className="text-sm text-gray-600 mb-2">{t("facilitySearchNote")}</p>
                {redFlagResult.nearestFacility ? (
                  <p className="text-sm font-semibold text-blue-700">{redFlagResult.nearestFacility}</p>
                ) : (
                  <Button variant="outline" size="sm" className="text-xs">
                    {t("findNearestFacility")}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{t("alertTime")}: {timestamp.toLocaleTimeString()}</span>
            </div>
            <span>{t("redFlagOverride")}</span>
          </div>

          {/* Warning */}
          <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-3">
            <p className="text-xs text-yellow-800 font-medium">
              ⚠️ {t("redFlagDisclaimer")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onContinueToFacility}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              {t("callEmergencyServices")}
            </Button>
            <Button
              onClick={onDismiss}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              {t("iUnderstand")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
