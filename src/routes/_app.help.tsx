import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { useI18n } from "@/lib/i18n";
import {
  Camera,
  WifiOff,
  KeyRound,
  Cpu,
  Activity,
  ArrowRightLeft,
  Shield,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

interface HelpSection {
  icon: typeof Camera;
  title: string;
  content: string;
}

const sections: HelpSection[] = [
  {
    icon: Camera,
    title: "Getting Started — Your First Triage",
    content:
      "1. Tap 'New Triage' from the bottom navigation.\n2. Enter the patient's ID, age, and sex.\n3. Select the presentation type (skin, respiratory, fever, etc.).\n4. For skin conditions: capture a photo with good lighting.\n5. For other conditions: describe the symptoms in detail.\n6. The AI analyzes and returns a condition, confidence score, and urgency.\n7. Complete the voice follow-up interview for more detail.\n8. Save the assessment — it syncs when you are back online.",
  },
  {
    icon: WifiOff,
    title: "How Offline Mode Works",
    content:
      "Trij stores everything locally on your device using IndexedDB. You can create patients, run assessments, and manage referrals without any internet connection. When you reconnect, data syncs automatically to Supabase. The AI runs locally via WebGPU (on supported devices) or falls back to demo mode. Cloud inference is available as a premium option on mobile.",
  },
  {
    icon: KeyRound,
    title: "Setting Up Offline PIN",
    content:
      "Go to Settings → Offline PIN. Enter a 4-6 digit PIN. This encrypts and stores the PIN locally. When you are offline and the session expires, use the PIN to unlock the app. You can reset or change the PIN anytime in Settings.",
  },
  {
    icon: Cpu,
    title: "AI Engine Selection",
    content:
      "Trij supports multiple AI engines:\n- Auto (default): Selects the best engine for your device.\n- WebGPU (WebLLM): Runs Gemma 2B locally. Fast, private, no internet needed. Requires Chrome/Edge on Android or desktop.\n- Cloud: Uses a remote API. Requires internet. Best for mobile devices without WebGPU support.\n- Ollama: Connects to a local Ollama instance for advanced users.\n- Demo: Uses mock data for testing. No AI involved.\nChange the engine in Settings.",
  },
  {
    icon: Activity,
    title: "Understanding Urgency Levels",
    content:
      "GREEN (Low): Minor condition. Treat locally with basic care. No referral needed. Example: mild rash, small cut, runny nose.\n\nYELLOW (Medium): Needs medical attention within 24-48 hours. Consider referring to a clinic. Example: infected wound, persistent fever, moderate dehydration.\n\nRED (High): Emergency. Requires immediate referral. Seek care as soon as possible. Example: difficulty breathing, chest pain, severe dehydration, altered consciousness.",
  },
  {
    icon: ArrowRightLeft,
    title: "How Referrals Work",
    content:
      "When the AI recommends a referral, the assessment is flagged as 'pending'. You can update the status on the Patient detail page. Generate a referral PDF with a QR code for the receiving clinic. Track the referral through stages: pending → active → awaiting feedback → resolved. When feedback is received from the referral facility, it is linked to the original assessment.",
  },
  {
    icon: Shield,
    title: "Data Privacy & Security",
    content:
      "Trij is built with privacy as the foundation:\n- Images are analyzed locally and never leave your device.\n- Only structured data (condition, urgency, vitals) syncs to the server.\n- Patient consent is captured before each assessment.\n- All data is encrypted in transit and at rest.\n- Supabase uses Row-Level Security (RLS) so each CHW only sees their own patients.\n- The app is free and open-source (Apache 2.0). Review the code on GitHub.",
  },
  {
    icon: HelpCircle,
    title: "Troubleshooting",
    content:
      "Camera not working? Try switching to gallery mode. Ensure camera permissions are granted in your browser settings.\n\nAI not responding? Try switching the engine in Settings (Auto usually works best). Ensure WebGPU is enabled in Chrome flags if using WebLLM.\n\nSync not working? Check your internet connection. Pending items will sync automatically when connectivity is restored. You can check the sync status indicator at the top of the screen.\n\nApp not loading? Clear the browser cache and reload. If the issue persists, reinstall the PWA.",
  },
];

export const Route = createFileRoute("/_app/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — User Guide | Trij" },
      {
        name: "description",
        content: "Help page for Trij offline-first AI medical triage app. Learn how to perform triage, manage referrals, use offline mode, set up PIN, and troubleshoot common issues.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="help">
      <HelpPage />
    </I18nErrorBoundary>
  ),
});

function HelpPage() {
  const { t } = useI18n();
  return (
    <>
      <AppHeader title="Help" subtitle="User guide and support" />
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display text-base font-semibold">{section.title}</h2>
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {section.content}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-muted/50 p-6 text-center">
          <h3 className="font-display text-base font-semibold">Need more help?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Trij is an open-source project. Report issues or contribute on GitHub.
          </p>
          <a
            href="https://github.com/Mosss-OS/trij"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            View on GitHub <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </>
  );
}
