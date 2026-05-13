import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MergeDialog } from "@/components/MergeDialog";
import { getDB } from "@/lib/db";
import { findPotentialDuplicates, runDedup, type MatchScore } from "@/lib/dedup";
import type { Patient } from "@/types/trij";
import { Search, UserRound, GitMerge, BadgeInfo } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/patients/")({
  head: () => ({ meta: [{ title: "Patients — Trij" }] }),
  component: () => (
    <ErrorBoundary kind="database">
      <PatientsList />
    </ErrorBoundary>
  ),
});

function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<MatchScore[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchScore | null>(null);
  const [dedupBusy, setDedupBusy] = useState(false);

  const loadPatients = async () => {
    try {
      const all = await getDB().patients.orderBy("createdAt").reverse().toArray();
      setPatients(all);
      const m = findPotentialDuplicates(all);
      setMatches(m.filter((x) => x.score >= 0.8));
    } catch {
      /* db unavailable */
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleAutoDedup = async () => {
    setDedupBusy(true);
    try {
      const autoMerged = await runDedup();
      const mergedCount = autoMerged.filter((m) => m.score >= 0.9).length;
      if (mergedCount > 0) {
        toast.success(`Auto-merged ${mergedCount} duplicate pair(s)`);
      }
      await loadPatients();
    } catch {
      toast.error("Dedup failed");
    } finally {
      setDedupBusy(false);
    }
  };

  const mergedIds = new Set(patients.filter((p) => p.mergedInto).map((p) => p.mergedInto!));
  const duplicateIds = new Set<string>();
  for (const m of matches) {
    duplicateIds.add(m.patientA.id);
    duplicateIds.add(m.patientB.id);
  }

  const matchByPatient = new Map<string, MatchScore>();
  for (const m of matches) {
    matchByPatient.set(m.patientA.id, m);
    matchByPatient.set(m.patientB.id, m);
  }

  const filtered = patients.filter((p) =>
    !p.mergedInto && p.identifier.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Patients" />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by identifier"
            className="pl-9"
          />
        </div>

        {matches.length > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-urgency-yellow/30 bg-urgency-yellow-bg/40 p-3">
            <div className="flex items-center gap-2 text-xs">
              <BadgeInfo className="h-4 w-4 text-urgency-yellow" />
              <span className="text-muted-foreground">
                {matches.length} potential duplicate pair(s) detected
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
              {dedupBusy ? "Merging..." : "Auto-merge"}
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-8 text-center">
            <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No patients yet.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {filtered.map((p) => {
              const match = matchByPatient.get(p.id);
              return (
                <li key={p.id}>
                  <Link
                    to="/_app/patients/$patientId"
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
                            Duplicate
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.ageYears ? `${p.ageYears}y` : "\u2014"} · {p.sex ?? "\u2014"} ·
                        added {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
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
                        Review
                      </Button>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedMatch && (
        <MergeDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => {
            if (!open) setSelectedMatch(null);
          }}
          onMerged={loadPatients}
        />
      )}
    </>
  );
}
