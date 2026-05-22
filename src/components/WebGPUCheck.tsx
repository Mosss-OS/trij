import { useEffect, useState } from "react";
import { checkWebGPUCompatibility, type WebGPUCompatibility } from "@/lib/gemma";
import { detectOllama, type EngineKind } from "@/lib/gemma";
import { useSettingsStore } from "@/stores/settingsStore";
import { Cloud, Cpu, Webhook, ExternalLink, AlertTriangle, CheckCircle2, Rabbit, FlaskConical, Gauge } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ENGINE_CAPABILITIES, getEnginePerformanceExpectation, type EngineKind as EngineManagerKind } from "@/lib/engine-manager";

interface Props {
  engineKind: EngineKind | "auto";
  ollamaUrl: string;
  compact?: boolean;
  showPerformance?: boolean;
}

export function WebGPUCheck({ engineKind, ollamaUrl, compact }: Props) {
  const { t } = useI18n();
  const [compat, setCompat] = useState<WebGPUCompatibility | null>(null);
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const engine = useSettingsStore((s) => s.engineKind);
  const setEngineKind = useSettingsStore((s) => s.setEngineKind);
  const cloudFallbackConsent = useSettingsStore((s) => s.cloudFallbackConsent);

  const currentEngine = ((engine === "auto" && compat?.supported) ? "webllm" : engine) as EngineManagerKind;
  const perf = ENGINE_CAPABILITIES[currentEngine];

  useEffect(() => {
    checkWebGPUCompatibility().then(setCompat);
  }, []);

  useEffect(() => {
    detectOllama(ollamaUrl).then(setOllamaOk);
  }, [ollamaUrl]);

  if (!compat) return null;

  const showAlternatives = !compat.supported && (engineKind === "auto" || engineKind === "webllm");

  if (compact && compat.supported) return null;

  if (compact && !compat.supported) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow/5 p-3 text-xs">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-urgency-yellow" />
        <div className="text-muted-foreground">
          <span className="font-medium text-foreground">{t("webgpuNotAvailable")}</span> on{" "}
          {compat.browser}. {compat.reason?.split(".")[0]}.{" "}
          <a
            href={compat.upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {compat.browser === "Unknown"
              ? t("downloadChrome")
              : t("updateBrowser").replace("{browser}", compat.browser)}{" "}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 ${
          compat.supported
            ? "border-emerald-500/20 bg-emerald-50/50"
            : "border-urgency-yellow/30 bg-urgency-yellow/5"
        }`}
      >
        {compat.supported ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-urgency-yellow" />
        )}
        <div className="min-w-0 text-sm">
          <p className="font-medium">
            {compat.supported ? t("webgpuAvailable") : t("webgpuNotAvailable")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {compat.supported
              ? `${compat.browser} ${compat.version} supports WebGPU.`
              : compat.reason}
          </p>
          {compat.supported && (
            <p className="mt-1 text-xs text-muted-foreground">
              {compat.browser} {compat.version} &middot; Minimum: {compat.minimumVersion}+
            </p>
          )}
          {!compat.supported && compat.upgradeUrl && (
            <a
              href={compat.upgradeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {compat.browser === "Unknown"
                ? t("downloadChrome")
                : t("updateBrowser").replace("{browser}", compat.browser)}
            </a>
          )}
        </div>
      </div>

      {showPerformance && perf && (
        <div className="flex items-start gap-3 rounded-2xl border bg-card p-3">
          <Gauge className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{t("inferenceEngine")}:</span> {perf.label}
            <span className="mx-1.5">&middot;</span>
            <span>{t("estimatedTime")}: {perf.estimatedLatency}</span>
          </div>
        </div>
      )}

      {showAlternatives && (
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("alternativeEngines")}
          </p>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setEngineKind("ollama")}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent ${
                  ollamaOk === true ? "border-emerald-500/30" : ""
                }`}
              >
                <Rabbit
                  className={`h-4 w-4 ${ollamaOk === true ? "text-emerald-600" : "text-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t("ollamaLocalServer")}</p>
                  <p className="text-xs text-muted-foreground">
                    {ollamaOk === null
                      ? t("checking")
                      : ollamaOk
                        ? t("ollamaDetected")
                        : t("ollamaNotDetected")}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setEngineKind("wasm" as any)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                <Webhook className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t("wasmFallback")}</p>
                  <p className="text-xs text-muted-foreground">{t("wasmFallbackDesc")}</p>
                </div>
              </button>
              {cloudFallbackConsent && (
                <button
                  onClick={() => setEngineKind("cloud")}
                  className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t("cloudMode")}</p>
                    <p className="text-xs text-muted-foreground">{t("cloudFallbackAvailable")}</p>
                  </div>
                </button>
              )}
              <button
                onClick={() => setEngineKind("demo")}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors hover:bg-accent"
              >
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t("demoMode")}</p>
                  <p className="text-xs text-muted-foreground">{t("mockDataNoModel")}</p>
                </div>
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
