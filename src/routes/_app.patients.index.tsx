import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDB } from "@/lib/db";
import type { Patient } from "@/types/trij";
import { Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/patients/")({
  head: () => ({ meta: [{ title: "Patients — Trij" }] }),
  component: PatientsList,
});

function PatientsList() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await getDB().patients.orderBy("createdAt").reverse().toArray();
        if (alive) setPatients(all);
      } catch {
        /* db unavailable */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = patients.filter((p) =>
    p.identifier.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <>
      <AppHeader title="Patients" />
      <main className="mx-auto max-w-2xl px-5 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by identifier"
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed p-8 text-center">
            <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No patients yet.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <Link
                  to="/_app/patients/$patientId"
                  params={{ patientId: p.id }}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/30"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.identifier}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.ageYears ? `${p.ageYears}y` : "—"} · {p.sex ?? "—"} ·
                      added {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
