import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getDB } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BadgeInfo, Search, UserRound, Plus, GitMerge, Lock, Unlock, Loader2 } from "lucide-react";
import { MergeDialog } from "@/components/MergeDialog";
import { toast } from "sonner";
import { findPotentialDuplicates, runDedup, type MatchScore } from "@/lib/dedup";
import { usePatientSearch } from "@/hooks/usePatientSearch";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/patients/")({
  head: () => ({
    meta: [
      {
        title: "Patients — Patient Record Management | Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Manage patient records offline with Trij's free patient management system. View visit history, search patients by ID, and track assessment timelines. Built for community health workers in remote areas.",
      },
      {
        name: "keywords",
        content:
          "patient record management, community health patient tracking, offline medical records, free patient database, CHW patient management, healthcare record keeping",
      },
      {
        property: "og:title",
        content: "Patients — Patient Record Management | Trij",
      },
      {
        property: "og:description",
        content:
          "Free offline patient record management for community health workers. Track visits, assessments, and referrals.",
      },
      {
        name: "twitter:title",
        content: "Patients — Patient Record Management | Trij",
      },
      {
        name: "twitter:description",
        content:
          "Free offline patient record management for community health workers. Track visits, assessments, and referrals.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="database">
      <PatientsList />
    </I18nErrorBoundary>
  ),
});

function PatientsList() {
  const { t } = useI18n();
  const fieldMode = useSettingsStore((s) => s.fieldMode);
  const { log } = useAuditLog();
  const [q, setQ] = useState("");
  const { patients, results, indexReady, reload } = usePatientSearch(q);
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchScore | null>(null);
  const [dedupBusy, setDedupBusy] = useState(false);

  useEffect(() => {
    if (results.length > 0) {
      log("patient:list", { resourceType: "patient", details: `Listed ${results.length} patients` });
    }
  }, [results.length]);

  useEffect(() => {
    if (patients.length > 0) {
      const m = findPotentialDuplicates(patients);
      setMatches(m.filter((x) => x.score >= 0.8));
    }
  }, [patients]);

  const handleAutoDedup = async () => {
    setDedupBusy(true);
    try {
      const autoMerged = await runDedup();
      const mergedCount = autoMerged.filter((m) => m.score >= 0.9).length;
      if (mergedCount > 0) {
        toast.success(`${t("autoMerged")} ${mergedCount} duplicate pair(s)`);
      }
      reload();
    } catch {
      toast.error(t("dedupFailed"));
    } finally {
      setDedupBusy(false);
    }
  };

  const matchByPatient = new Map<string, MatchScore>();
  for (const m of matches) {
    matchByPatient.set(m.patientA.id, m);
    matchByPatient.set(m.patientB.id, m);
  }

  return (
    <>
      <AppHeader title={t("patients")} />
      <div className="mx-auto max-w-4xl px-5 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
          />
        </div>

        {matches.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow-bg/40 p-3">
            <div className="flex items-center gap-2 text-xs">
              <BadgeInfo className="h-4 w-4 text-urgency-yellow" />
              <span className="text-muted-foreground">
                {matches.length} {t("potentialDuplicates")}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleAutoDedup}
              disabled={dedupBusy}
            >
              <GitMerge className="h-3.5 w-3.5" />
              {dedupBusy ? t("merging") : t("autoMerge")}
            </Button>
          </div>
        )}

        {!indexReady ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("buildingIndex")}
          </div>
        ) : results.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-8 text-center">
            <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              {q ? t("noPatientsMatch") : t("noPatientsYet")}
            </p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {results.map((p) => {
              const match = matchByPatient.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: p.id }}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="relative grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                      {match && (
                        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-urgency-yellow text-[8px] font-bold text-white">
                          !
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{p.identifier}</p>
                        {match && (
                          <span className="flex items-center gap-1 rounded-full border border-urgency-yellow/30 px-2 py-0.5 text-[10px] font-medium text-urgency-yellow">
                            <GitMerge className="h-3 w-3" />
                            {t("duplicate")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.ageYears ? `${p.ageYears}y` : "\u2014"} · {p.sex ?? "\u2014"} ·{" "}
                        {t("added")}{" "}
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {match && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedMatch(match);
                        }}
                      >
                        <GitMerge className="h-3.5 w-3.5" />
                        {t("review")}
                      </Button>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {fieldMode && (
        <div className="mx-auto max-w-4xl px-5 pb-24">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={async () => {
              const code = window.prompt("Enter supervisor PIN to exit field mode:");
              if (!code) return;
              try {
                const { verifyPin } = await import("@/lib/pin-auth");
                const ok = await verifyPin("supervisor", code);
                if (ok) {
                  useSettingsStore.getState().setFieldMode(false);
                  toast.success("Field mode disabled");
                } else {
                  toast.error("Incorrect supervisor PIN");
                }
              } catch {
                toast.error("Failed to verify PIN");
              }
            }}
          >
            <Unlock className="h-4 w-4" /> {t("exitFieldMode")}
          </Button>
        </div>
      )}

      {selectedMatch && (
        <MergeDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => {
            if (!open) setSelectedMatch(null);
          }}
          onMerged={reload}
        />
      )}
    </>
  );
}
