import { useState } from "react";
import {
  AlertTriangle,
  Phone,
  MessageSquare,
  MapPin,
  Copy,
  ChevronDown,
  ChevronUp,
  Check,
  Heart,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface Props {
  patientName?: string;
  patientId?: string;
  condition?: string;
  locationLat?: number;
  locationLng?: number;
}

const PROTOCOLS = [
  { key: "Unresponsive", icon: Heart },
  { key: "Bleeding", icon: AlertTriangle },
  { key: "Seizure", icon: Eye },
  { key: "Obstetric", icon: AlertTriangle },
  { key: "Respiratory", icon: AlertTriangle },
  { key: "Anaphylaxis", icon: AlertTriangle },
] as const;

export function EmergencyMode({ patientName, patientId, condition, locationLat, locationLng }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);
  const [smsSent, setSmsSent] = useState(false);

  const gpsText = locationLat != null && locationLng != null
    ? `${locationLat.toFixed(6)}, ${locationLng.toFixed(6)}`
    : null;

  const copyGps = async () => {
    if (!gpsText) return;
    try {
      await navigator.clipboard.writeText(gpsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  const smsBody = gpsText
    ? `EMERGENCY - ${patientName || "Patient"} (${patientId || "ID unknown"}) - ${condition || "Urgent assessment needed"} - Location: ${gpsText}`
    : `EMERGENCY - ${patientName || "Patient"} (${patientId || "ID unknown"}) - ${condition || "Urgent assessment needed"}`;

  const emergencyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open("tel:112", "_self");
  };

  const emergencySms = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(`sms:112?body=${encodeURIComponent(smsBody)}`, "_self");
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 5000);
  };

  return (
    <Card className="border-urgency-red/40 overflow-hidden">
      <div className="bg-urgency-red px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-white animate-pulse flex-shrink-0" />
        <div>
          <h2 className="text-lg font-bold text-white">{t("emergencyAlert")}</h2>
          <p className="text-sm text-red-100">{t("immediateActionRequired")}</p>
        </div>
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button
            onClick={emergencyPhone}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white gap-2 h-auto py-3"
          >
            <Phone className="h-5 w-5" />
            <span className="text-sm font-bold">{t("emergencyDial")}</span>
          </Button>
          <Button
            onClick={emergencySms}
            variant="outline"
            size="lg"
            className="border-red-300 text-red-700 hover:bg-red-50 gap-2 h-auto py-3"
          >
            {smsSent ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <MessageSquare className="h-5 w-5" />
            )}
            <span className="text-sm font-bold">{t("emergencySmsPreAlert")}</span>
          </Button>
          <Button
            onClick={copyGps}
            disabled={!gpsText}
            variant="outline"
            size="lg"
            className="border-red-300 text-red-700 hover:bg-red-50 gap-2 h-auto py-3"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
            <div className="text-left">
              <span className="text-sm font-bold block">{t("copyGps")}</span>
              {gpsText && (
                <span className="text-[10px] font-mono text-muted-foreground block truncate max-w-[120px]">
                  {gpsText}
                </span>
              )}
            </div>
          </Button>
        </div>

        {gpsText && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-mono text-muted-foreground">{gpsText}</span>
            {copied && (
              <span className="ml-auto text-xs font-medium text-green-600">{t("gpsCopied")}</span>
            )}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-urgency-red" />
            <h3 className="text-sm font-semibold">{t("emergencyProtocols")}</h3>
            <span className="text-[10px] text-muted-foreground">{t("emergencyProtocolsDesc")}</span>
          </div>
          <div className="space-y-2">
            {PROTOCOLS.map((p) => {
              const isOpen = expandedProtocol === p.key;
              const Icon = p.icon;
              return (
                <div
                  key={p.key}
                  className="rounded-lg border border-red-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedProtocol(isOpen ? null : p.key)}
                    className="flex w-full items-center justify-between gap-2 bg-red-50/50 px-3 py-2 text-left text-sm font-medium hover:bg-red-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-urgency-red" />
                      {t(`protocol${p.key}`)}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="bg-white px-3 py-2.5 text-xs leading-relaxed text-foreground/80 border-t border-red-100 whitespace-pre-line">
                      {t(`protocol${p.key}Steps`)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground italic">
          {t("emergencyDisclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
