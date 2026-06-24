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
  titleKey: string;
  contentKey: string;
}

const sections: HelpSection[] = [
  {
    icon: Camera,
    titleKey: "helpSection1Title",
    contentKey: "helpSection1Content",
  },
  {
    icon: WifiOff,
    titleKey: "helpSection2Title",
    contentKey: "helpSection2Content",
  },
  {
    icon: KeyRound,
    titleKey: "helpSection3Title",
    contentKey: "helpSection3Content",
  },
  {
    icon: Cpu,
    titleKey: "helpSection4Title",
    contentKey: "helpSection4Content",
  },
  {
    icon: Activity,
    titleKey: "helpSection5Title",
    contentKey: "helpSection5Content",
  },
  {
    icon: ArrowRightLeft,
    titleKey: "helpSection6Title",
    contentKey: "helpSection6Content",
  },
  {
    icon: Shield,
    titleKey: "helpSection7Title",
    contentKey: "helpSection7Content",
  },
  {
    icon: HelpCircle,
    titleKey: "helpSection8Title",
    contentKey: "helpSection8Content",
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
      <AppHeader title={t("help")} subtitle={t("userGuide")} />
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="font-display text-base font-semibold">{t(section.titleKey as "helpSection1Title" | "helpSection2Title" | "helpSection3Title" | "helpSection4Title" | "helpSection5Title" | "helpSection6Title" | "helpSection7Title" | "helpSection8Title")}</h2>
              </div>
              <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {t(section.contentKey as "helpSection1Content" | "helpSection2Content" | "helpSection3Content" | "helpSection4Content" | "helpSection5Content" | "helpSection6Content" | "helpSection7Content" | "helpSection8Content")}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border bg-muted/50 p-6 text-center">
          <h3 className="font-display text-base font-semibold">{t("needMoreHelp")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("openSourceDescription")}
          </p>
          <a
            href="https://github.com/Mosss-OS/trij"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            {t("viewOnGitHub")} <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </>
  );
}
