import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Download, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

type FallbackKind = "default" | "camera" | "engine" | "database" | "triage" | "document" | "faq" | "help";

interface Props {
  children: ReactNode;
  kind?: FallbackKind;
  onReset?: () => void;
  t?: (key: string) => string;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

const FALLBACK_KEYS: Record<
  FallbackKind,
  { title: string; description: string; action: string; secondary?: { label: string; to: string } }
> = {
  default: {
    title: "somethingWentWrong",
    description: "unexpectedError",
    action: "tryAgain",
  },
  camera: {
    title: "cameraUnavailable",
    description: "cameraErrorDesc",
    action: "tryAgain",
    secondary: { label: "uploadPhoto", to: "/triage" },
  },
  engine: {
    title: "aiEngineError",
    description: "engineErrorDesc",
    action: "retry",
    secondary: { label: "openSettings", to: "/settings" },
  },
  database: {
    title: "databaseError",
    description: "databaseErrorDesc",
    action: "retry",
    secondary: { label: "goHome", to: "/dashboard" },
  },
  triage: {
    title: "triageInterrupted",
    description: "triageInterruptedDesc",
    action: "tryAgain",
    secondary: { label: "goToPatients", to: "/patients" },
  },
  document: {
    title: "scanFailed",
    description: "scanFailedDesc",
    action: "tryAgain",
    secondary: { label: "uploadFromGallery", to: "/document" },
  },
  faq: {
    title: "somethingWentWrong",
    description: "unexpectedError",
    action: "retry",
    secondary: { label: "goHome", to: "/dashboard" },
  },
  help: {
    title: "somethingWentWrong",
    description: "unexpectedError",
    action: "retry",
    secondary: { label: "goHome", to: "/dashboard" },
  },
};

const FALLBACK_EN: Record<string, string> = {
  somethingWentWrong: "Something went wrong",
  unexpectedError: "An unexpected error occurred. Please try again.",
  tryAgain: "Try again",
  cameraUnavailable: "Camera unavailable",
  cameraErrorDesc:
    "Camera access was denied or is not available on this device. You can upload a photo instead.",
  uploadPhoto: "Upload photo",
  aiEngineError: "AI engine error",
  engineErrorDesc:
    "The AI engine failed to initialize. Try switching to Demo mode in Settings, or restart the app.",
  retry: "Retry",
  openSettings: "Open settings",
  databaseError: "Database error",
  databaseErrorDesc:
    "Your local database is not responding. Your data is safe — restart the app. If the issue persists, export your data.",
  goHome: "Go home",
  triageInterrupted: "Triage interrupted",
  triageInterruptedDesc:
    "The assessment could not be completed. Your patient data has been saved. You can try again or use manual mode.",
  goToPatients: "Go to patients",
  scanFailed: "Scan failed",
  scanFailedDesc: "Could not process the document. Try a clearer photo or upload from gallery.",
  uploadFromGallery: "Upload from gallery",
  downloadErrorData: "Download error data",
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ info });
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
    this.props.onReset?.();
  };

  handleDownloadData = () => {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            { error: this.state.error?.message, stack: this.state.error?.stack },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trij-error-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // download failure is non-critical
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    const kind = this.props.kind ?? "default";
    const content = FALLBACK_KEYS[kind];
    const tr = this.props.t ?? ((k: string) => FALLBACK_EN[k] ?? k);

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold">{tr(content.title)}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{tr(content.description)}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={this.handleReset} variant="default" size="sm">
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {tr(content.action)}
          </Button>

          {content.secondary && (
            <Button variant="outline" size="sm" asChild>
              <Link to={content.secondary.to as never}>{tr(content.secondary.label)}</Link>
            </Button>
          )}

          <Button onClick={this.handleDownloadData} variant="ghost" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            {tr("downloadErrorData")}
          </Button>
        </div>
      </div>
    );
  }
}

export function I18nErrorBoundary(props: Omit<Props, "t">) {
  const { t } = useI18n();
  return <ErrorBoundary {...props} t={t as (key: string) => string} />;
}
