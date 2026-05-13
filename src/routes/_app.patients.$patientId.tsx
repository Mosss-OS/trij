import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDB } from "@/lib/db";
import type { Patient, Assessment } from "@/types/trij";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import { Camera, FileDown, UserRound } from "lucide-react";
import { format } from "date-fns";
import { generateReferralPdf } from "@/lib/referral";

export const Route = createFileRoute("/_app/patients/$patientId")({
  head: () => ({ meta: [{ title: "Patient — Trij" }] }),
  component: PatientDetail,
});

function PatientDetail() {
  const { patientId } = Route.useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = getDB();
        const p = await db.patients.get(patientId);
        const a = await db.assessments.where("patientId").equals(patientId).reverse().sortBy("createdAt");
        if (!alive) return;
        setPatient(p ?? null);
        setAssessments(a);
      } catch {
        /* */
      }
    })();
    return () => {
      alive = false;
    };
  }, [patientId]);

  if (!patient) {
    return (
      <>
        <AppHeader title="Patient" />
        <div className="mx-auto max-w-2xl px-5 py-10 text-center text-sm text-muted-foreground">
          Patient not found locally.
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={patient.identifier} subtitle={`${patient.ageYears ?? "?"}y · ${patient.sex ?? "—"}`} />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="rounded-3xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold">{patient.identifier}</h1>
              <p className="text-xs text-muted-foreground">
                {assessments.length} assessment{assessments.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link to="/_app/triage" className="mt-4 block">
            <Button className="w-full gap-2">
              <Camera className="h-4 w-4" /> New assessment
            </Button>
          </Link>
        </div>

        <h2 className="mt-7 mb-3 font-display text-lg font-semibold">Timeline</h2>
        {assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessments yet.</p>
        ) : (
          <ul className="space-y-3">
            {assessments.map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{a.condition ?? "Assessment"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(a.createdAt), "PPp")} · conf {Math.round(a.confidence ?? 0)}%
                    </p>
                  </div>
                  {a.urgency && <UrgencyPill urgency={a.urgency} />}
                </div>
                {a.recommendation && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {a.recommendation}
                  </p>
                )}
                {a.images?.[0] && (
                  <img src={a.images[0]} alt="" className="mt-3 h-32 w-32 rounded-xl object-cover" />
                )}
                {a.referralAdvised && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => generateReferralPdf(patient, a)}
                  >
                    <FileDown className="h-4 w-4" /> Referral slip
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
