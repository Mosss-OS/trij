import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const faqs: FaqItem[] = [
  {
    q: "Does Trij work without internet?",
    a: "Yes. Trij is designed for offline-first use. The AI model runs locally on your device through WebGPU (or falls back to demo mode). All patient data, images, and assessments are stored locally using IndexedDB. Sync to Supabase happens automatically when connectivity is restored.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Patient data never leaves your device. Images are analyzed locally and are never uploaded anywhere. Only structured, anonymized assessment records (condition, urgency, vital signs) sync to the server when you choose. Trij uses Row-Level Security (RLS) in Supabase so CHWs can only see their own patients.",
  },
  {
    q: "What phones are supported?",
    a: "Trij works on any modern smartphone with a web browser. For on-device AI, you need Chrome or Edge with WebGPU support (Android or desktop). Older phones or iOS devices will use cloud inference or demo mode automatically. You can install Trij as a Progressive Web App (PWA) for a native-like experience.",
  },
  {
    q: "How accurate is the AI?",
    a: "The AI is a clinical decision support tool, not a diagnostic device. Accuracy depends on image quality, lighting, and the condition being assessed. Always verify with clinical judgment. The AI shows a confidence score (0-100%) so you know how reliable the assessment is. Low-confidence results recommend referral.",
  },
  {
    q: "Can I use Trij for non-skin conditions?",
    a: "Yes. As of v1.2, Trij supports multiple presentation types including respiratory, fever, gastrointestinal, neurological, malnutrition, eye/ear, and musculoskeletal conditions. Select the appropriate presentation type at the start of the triage and describe the symptoms. A photo is optional for non-dermatology assessments.",
  },
  {
    q: "How do I become a supervisor?",
    a: "Supervisors can view dashboards with referral queues, analytics, and CSV exports. To become a supervisor, ask an existing supervisor for a supervisor code. Go to Settings → Become Supervisor, enter the code, and you will be granted supervisor access to the dashboard.",
  },
  {
    q: "How do I export data?",
    a: "Supervisors can export assessment data as CSV from the Supervisor Dashboard. Go to the dashboard and click 'Export CSV' to download assessments, conditions, trends, or CHW performance data. Individual referral PDFs can be generated from the Referrals page or Patient detail page.",
  },
  {
    q: "How does offline PIN login work?",
    a: "You can set up a PIN for offline access in Settings → Offline PIN. This stores an encrypted PIN on your device. When you are offline and cannot authenticate with Supabase, you can use the PIN to log in and access the app. Your session will sync when you reconnect.",
  },
  {
    q: "What do the urgency colors mean?",
    a: "Green (Low): Minor condition that can be treated locally. No referral needed. Yellow (Medium): Needs medical attention within 24-48 hours. Consider referral to a clinic. Red (High): Emergency requiring immediate referral. Seek care as soon as possible.",
  },
  {
    q: "How do voice interviews work?",
    a: "After the initial AI assessment, voice follow-up asks targeted questions to gather more clinical detail. The AI adapts questions based on previous answers using function-calling. You can also type answers if voice is unavailable. The interview can be interrupted and resumed later.",
  },
];

export const Route = createFileRoute("/_app/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Frequently Asked Questions | Trij" },
      {
        name: "description",
        content: "Frequently asked questions about Trij. Learn about offline mode, data privacy, supported phones, AI accuracy, and more for this free offline-first AI medical triage app.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="faq">
      <FaqPage />
    </I18nErrorBoundary>
  ),
});

function FaqPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(search.toLowerCase()) ||
      faq.a.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <AppHeader title={t("faq")} subtitle={t("faqSubtitle")} />
      <div className="mx-auto max-w-3xl px-5 py-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("faqSearchPlaceholder")}
            className="pl-9"
          />
        </div>

        <div className="space-y-2">
          {filtered.map((faq, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between p-4 text-left text-sm font-medium"
              >
                {faq.q}
                {openIndex === i ? (
                  <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                )}
              </button>
              {openIndex === i && (
                <div className="border-t px-4 pb-4 pt-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("faqNoResults")}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
