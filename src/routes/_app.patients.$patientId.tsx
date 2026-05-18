import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDB } from "@/lib/db";
import type { Patient, Assessment } from "@/types/trij";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, FileDown, Share2, UserRound, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { downloadReferralPdf, shareReferralPdf } from "@/lib/referral";
import { updateReferralStatus } from "@/lib/sync";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/patients/$patientId")({
  head: () => ({
    meta: [
      {
        title: "Patient Details — Medical History & Triage Results | Trij",
      },
      {
        name: "description",
        content:
          "View patient medical history, past triage assessments, wound analysis results, referral status, and visit timeline. Part of Trij's free offline-first patient management system for community health workers.",
      },
      {
        name: "keywords",
        content:
          "patient medical history, triage results, wound assessment history, patient visit timeline, medical records view, CHW patient detail",
      },
      { property: "og:title", content: "Patient Details — Trij Medical Triage" },
      {
        property: "og:description",
        content:
          "View comprehensive patient history, triage assessments, and referral status. Free offline medical records.",
      },
      { name: "twitter:title", content: "Patient Details — Trij Medical Triage" },
      {
        name: "twitter:description",
        content:
          "View comprehensive patient history, triage assessments, and referral status. Free offline medical records.",
      },
    ],
  }),
  component: PatientDetail,
});

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "In transit",
  resolved: "Resolved",
};

const REFERRAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-urgency-yellow-bg text-urgency-yellow border-urgency-yellow/30",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
};

function ReferralStatusBadge({ status }: { status: string }) {
  if (status === "none") return null;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${REFERRAL_STATUS_COLORS[status] || ""}`}
    >
      {REFERRAL_STATUS_LABELS[status] || status}
    </span>
  );
}

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
        const a = await db.assessments
          .where("patientId")
          .equals(patientId)
          .reverse()
          .sortBy("createdAt");
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
      <AppHeader
        title={patient.identifier}
        subtitle={`${patient.ageYears ?? "?"}y · ${patient.sex ?? "—"}`}
      />
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
          <Link to="/triage" className="mt-4 block">
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
                  <img
                    src={a.images[0]}
                    alt="Patient assessment photo"
                    className="mt-3 h-32 w-32 rounded-xl object-cover"
                  />
                )}
                {a.referralAdvised && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ReferralStatusBadge status={a.referralStatus} />
                    <Select
                      value={a.referralStatus}
                      onValueChange={(v) => {
                        const s = v as "none" | "pending" | "active" | "resolved";
                        updateReferralStatus(a.id, s);
                        toast.success(`Referral marked as ${s}`);
                      }}
                    >
                      <SelectTrigger className="h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">In transit</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => downloadReferralPdf(patient, a)}
                    >
                      <FileDown className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => shareReferralPdf(patient, a)}
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
