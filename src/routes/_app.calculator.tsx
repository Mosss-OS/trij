import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { PediatricDoseCalculator } from "@/components/PediatricDoseCalculator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/calculator")({
  head: () => ({
    meta: [
      {
        title: "Pediatric Dose Calculator — Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Pediatric weight-based dose calculator for common medications. WHO-recommended dosing guidelines for paracetamol, amoxicillin, artemether-lumefantrine, ORS, and zinc — all offline.",
      },
      {
        name: "keywords",
        content:
          "pediatric dose calculator, children medication dosage, WHO drug guidelines, medical calculator offline, CHW medication tools",
      },
      {
        property: "og:title",
        content: "Pediatric Dose Calculator — Trij Medical Triage",
      },
      {
        property: "og:description",
        content:
          "Calculate pediatric medication doses by weight using WHO guidelines for common medications.",
      },
      {
        name: "twitter:title",
        content: "Pediatric Dose Calculator — Trij Medical Triage",
      },
      {
        name: "twitter:description",
        content:
          "Calculate pediatric medication doses by weight using WHO guidelines for common medications.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="database">
      <CalculatorPage />
    </I18nErrorBoundary>
  ),
});

function CalculatorPage() {
  const { t } = useI18n();
  return (
    <>
      <AppHeader title={t("pediatricDoseCalculator")} subtitle={t("whoDosingGuidelines")} />
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="mb-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> {t("backToDashboard")}
            </Button>
          </Link>
        </div>
        <PediatricDoseCalculator />
      </div>
    </>
  );
}
