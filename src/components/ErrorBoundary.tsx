import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Download, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";

type FallbackKind = "default" | "camera" | "engine" | "database" | "triage" | "document";

interface Props {
  children: ReactNode;
  kind?: FallbackKind;
  onReset?: () => void;
}

interface State {
  error: Error | null;
  info: ErrorInfo | null;
}

const FALLBACK_CONTENT: Record<
  FallbackKind,
  {
    title: string;
    description: string;
    action: string;
    secondary?: { label: string; to: string };
  }
> = {
  default: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    action: "Try again",
  },
  camera: {
    title: "Camera unavailable",
    description:
      "Camera access was denied or is not available on this device. You can upload a photo instead.",
    action: "Try again",
    secondary: { label: "Upload photo", to: "/triage" },
  },
  engine: {
    title: "AI engine error",
    description:
      "The AI engine failed to initialize. Try switching to Demo mode in Settings, or restart the app.",
    action: "Retry",
    secondary: { label: "Open settings", to: "/settings" },
  },
  database: {
    title: "Database error",
    description:
      "Your local database is not responding. Your data is safe — restart the app. If the issue persists, export your data.",
    action: "Retry",
    secondary: { label: "Go home", to: "/dashboard" },
  },
  triage: {
    title: "Triage interrupted",
    description:
      "The assessment could not be completed. Your patient data has been saved. You can try again or use manual mode.",
    action: "Try again",
    secondary: { label: "Go to patients", to: "/patients" },
  },
  document: {
    title: "Scan failed",
    description: "Could not process the document. Try a clearer photo or upload from gallery.",
    action: "Try again",
    secondary: { label: "Upload from gallery", to: "/document" },
  },
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
    const content = FALLBACK_CONTENT[kind];

    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-semibold">{content.title}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{content.description}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={this.handleReset} variant="default" size="sm">
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {content.action}
          </Button>

          {content.secondary && (
            <Button variant="outline" size="sm" asChild>
              <Link to={content.secondary.to as never}>{content.secondary.label}</Link>
            </Button>
          )}

          <Button onClick={this.handleDownloadData} variant="ghost" size="sm">
            <Download className="mr-1.5 h-4 w-4" />
            Download error data
          </Button>
        </div>
      </div>
    );
  }
}
