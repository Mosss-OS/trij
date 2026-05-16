import { useEffect, useState, useCallback } from "react";
import {
  detectOllama,
  detectOllamaModel,
  listOllamaModels,
  clearOllamaCache,
  type OllamaModelInfo,
} from "@/lib/gemma";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Rabbit,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Terminal,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function OllamaSetup() {
  const { t } = useI18n();
  const s = useSettingsStore();
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null);
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [hasModel, setHasModel] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [showPullGuide, setShowPullGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setTesting(true);
    setError(null);
    clearOllamaCache();
    const ok = await detectOllama(s.ollamaUrl);
    setOllamaOk(ok);
    if (ok) {
      const available = await listOllamaModels(s.ollamaUrl);
      setModels(available);
      const found = await detectOllamaModel(s.ollamaModel || "gemma4", s.ollamaUrl);
      setHasModel(found);
    }
    setTesting(false);
  }, [s.ollamaUrl, s.ollamaModel]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t("ollamaUrl")}</Label>
        <Input
          value={s.ollamaUrl}
          onChange={(e) => {
            s.setOllamaUrl(e.target.value);
            clearOllamaCache();
          }}
          placeholder="http://localhost:11434"
        />
      </div>

      <div className="flex items-center gap-3">
        {ollamaOk === null && testing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("checkingConnection")}
          </div>
        )}

        {ollamaOk === true && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {t("connected")}
          </div>
        )}

        {ollamaOk === false && !testing && (
          <div className="flex items-center gap-2 text-sm text-urgency-yellow">
            <AlertTriangle className="h-4 w-4" />
            {t("notReachable")}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={checkConnection}
          disabled={testing}
          className="gap-1.5"
        >
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t("testConnection")}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {ollamaOk === false && !testing && (
        <div className="rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow/5 p-4">
          <div className="flex items-start gap-3">
            <Rabbit className="mt-0.5 h-5 w-5 flex-shrink-0 text-urgency-yellow" />
            <div className="text-sm">
              <p className="font-medium">{t("installOllama")}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
                <li>
                  {t("downloadFrom")}{" "}
                  <a
                    href="https://ollama.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    ollama.com <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  {t("runInTerminal")}{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    ollama pull {s.ollamaModel || "gemma4"}
                  </code>
                </li>
                <li>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t("restartApp").replace(
                        "Test connection",
                        `<button onClick=${'"'}${checkConnection}${'"'} class="text-primary hover:underline">${t("testConnection")}</button>`,
                      ),
                    }}
                  />
                </li>
              </ol>
              <a
                href="/scripts/download-gemma4.sh"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Terminal className="h-3 w-3" />
                {t("viewSetupScript")}
              </a>
            </div>
          </div>
        </div>
      )}

      {ollamaOk === true && (
        <>
          <div className="space-y-1.5">
            <Label>{t("ollamaModel")}</Label>
            <Input
              value={s.ollamaModel}
              onChange={(e) => s.setOllamaModel(e.target.value)}
              placeholder="gemma4"
            />
          </div>

          {hasModel === false && (
            <div className="rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-urgency-yellow" />
                <div className="text-sm">
                  <p className="font-medium">
                    {t("modelNotFound").replace("{model}", s.ollamaModel || "gemma4")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("pullFromTerminal")}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPullGuide(!showPullGuide)}
                      className="gap-1.5"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      {t("pullInstructions")}
                    </Button>
                  </div>
                  {showPullGuide && (
                    <div className="mt-3 rounded-xl bg-muted p-3 font-mono text-xs">
                      <p className="text-muted-foreground"># In your terminal:</p>
                      <p className="mt-1">ollama pull {s.ollamaModel || "gemma4"}</p>
                      <p className="mt-2 text-muted-foreground"># Verify it is downloaded:</p>
                      <p className="mt-1">ollama list</p>
                      <p className="mt-2 text-muted-foreground">
                        # Then restart this app or test the connection above.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {hasModel === true && (
            <p className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("modelAvailable").replace("{model}", s.ollamaModel || "gemma4")}
            </p>
          )}

          {models.length > 0 && (
            <div className="rounded-xl border bg-secondary/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {t("availableModels").replace("{count}", String(models.length))}
              </p>
              <ul className="mt-2 space-y-1">
                {models.map((m) => (
                  <li key={m.name} className="flex items-center justify-between text-xs">
                    <span className="font-mono">{m.name}</span>
                    <span className="text-muted-foreground">{m.size}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
