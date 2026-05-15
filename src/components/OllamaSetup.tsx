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

export function OllamaSetup() {
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
        <Label>Ollama URL</Label>
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
            Checking connection...
          </div>
        )}

        {ollamaOk === true && (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Connected
          </div>
        )}

        {ollamaOk === false && !testing && (
          <div className="flex items-center gap-2 text-sm text-urgency-yellow">
            <AlertTriangle className="h-4 w-4" />
            Not reachable
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
          Test connection
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {ollamaOk === false && !testing && (
        <div className="rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow/5 p-4">
          <div className="flex items-start gap-3">
            <Rabbit className="mt-0.5 h-5 w-5 flex-shrink-0 text-urgency-yellow" />
            <div className="text-sm">
              <p className="font-medium">Install Ollama to run models locally</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
                <li>
                  Download from{" "}
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
                  Run in terminal:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                    ollama pull {s.ollamaModel || "gemma4"}
                  </code>
                </li>
                <li>
                  Restart this app or click{" "}
                  <button onClick={checkConnection} className="text-primary hover:underline">
                    Test connection
                  </button>
                </li>
              </ol>
              <a
                href="/scripts/download-gemma4.sh"
                className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Terminal className="h-3 w-3" />
                View setup script
              </a>
            </div>
          </div>
        </div>
      )}

      {ollamaOk === true && (
        <>
          <div className="space-y-1.5">
            <Label>Ollama model</Label>
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
                    Model &quot;{s.ollamaModel || "gemma4"}&quot; not found
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pull it from the terminal or use the button below.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPullGuide(!showPullGuide)}
                      className="gap-1.5"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      Pull instructions
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
              Model &quot;{s.ollamaModel || "gemma4"}&quot; is available
            </p>
          )}

          {models.length > 0 && (
            <div className="rounded-xl border bg-secondary/30 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Available models ({models.length})
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
