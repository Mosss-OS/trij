import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDB } from "@/lib/db";
import type { Patient, Assessment, FollowUp } from "@/types/trij";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar, Camera, FileDown, Share2, UserRound, RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { downloadReferralPdf, shareReferralPdf } from "@/lib/referral";
import { updateReferralStatus, saveReferralFeedback, queueFollowUp, updateFollowUpStatus } from "@/lib/sync";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const user = useSessionStore((s) => s.user);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [feedbackAssessmentId, setFeedbackAssessmentId] = useState<string | null>(null);
  const [feedbackDiagnosis, setFeedbackDiagnosis] = useState("");
  const [feedbackTreatment, setFeedbackTreatment] = useState("");
  const [feedbackFacility, setFeedbackFacility] = useState("");
  const [feedbackOutcome, setFeedbackOutcome] = useState<"treated" | "referred_elsewhere" | "admitted" | "discharged" | "unknown">("unknown");
  const [feedbackNotes, setFeedbackNotes] = useState("");

  const loadData = async () => {
    try {
      const db = getDB();
      const p = await db.patients.get(patientId);
      const a = await db.assessments
        .where("patientId")
        .equals(patientId)
        .reverse()
        .sortBy("createdAt");
      const f = await db.followUps
        .where("patientId")
        .equals(patientId)
        .reverse()
        .sortBy("scheduledFor");
      setPatient(p ?? null);
      setAssessments(a);
      setFollowUps(f);
    } catch {
      /* */
    }
  };

  useEffect(() => {
    let alive = true;
    loadData().then(() => { /* */ });
    return () => {
      alive = false;
    };
  }, [patientId]);

  const handleSchedule = async () => {
    if (!user || !scheduleDate) return;
    const followUp: FollowUp = {
      id: crypto.randomUUID(),
      patientId,
      assessmentId: assessments[0]?.id,
      chwUserId: user.id,
      scheduledFor: scheduleDate,
      status: "pending",
      notes: scheduleNotes || undefined,
      createdAt: new Date().toISOString(),
      version: 0,
    };
    await queueFollowUp(followUp);
    setFollowUps((prev) => [followUp, ...prev]);
    setScheduleOpen(false);
    setScheduleDate("");
    setScheduleNotes("");
    toast.success(t("savedOffline"));
  };

  const handleComplete = async (id: string) => {
    await updateFollowUpStatus(id, "completed", new Date().toISOString());
    setFollowUps((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "completed", completedAt: new Date().toISOString() } : f,
      ),
    );
    toast.success(t("followUp") + " completed");
  };

  const handleCancel = async (id: string) => {
    await updateFollowUpStatus(id, "cancelled");
    setFollowUps((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "cancelled" } : f)),
    );
  };

  const handleSaveFeedback = async () => {
    if (!feedbackAssessmentId) return;
    const feedback = {
      diagnosis: feedbackDiagnosis || undefined,
      treatment: feedbackTreatment || undefined,
      outcome: feedbackOutcome,
      facilityName: feedbackFacility || undefined,
      notes: feedbackNotes || undefined,
      providedAt: new Date().toISOString(),
    };
    await saveReferralFeedback(feedbackAssessmentId, feedback);
    setFeedbackDialogOpen(false);
    setFeedbackDiagnosis("");
    setFeedbackTreatment("");
    setFeedbackFacility("");
    setFeedbackOutcome("unknown");
    setFeedbackNotes("");
    toast.success("Feedback saved");
    loadData();
  };

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
                    {a.icd10Code && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        ICD-10: {a.icd10Code}
                      </p>
                    )}
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
                {a.vitalSigns && (
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border bg-muted/20 p-3 text-xs">
                    {a.vitalSigns.systolicBP && (
                      <div>
                        <span className="text-muted-foreground">BP</span>
                        <p className="font-medium">
                          {a.vitalSigns.systolicBP}/{a.vitalSigns.diastolicBP}
                        </p>
                      </div>
                    )}
                    {a.vitalSigns.heartRate && (
                      <div>
                        <span className="text-muted-foreground">HR</span>
                        <p className="font-medium">{a.vitalSigns.heartRate} bpm</p>
                      </div>
                    )}
                    {a.vitalSigns.temperature && (
                      <div>
                        <span className="text-muted-foreground">Temp</span>
                        <p className="font-medium">{a.vitalSigns.temperature}°C</p>
                      </div>
                    )}
                    {a.vitalSigns.respiratoryRate && (
                      <div>
                        <span className="text-muted-foreground">RR</span>
                        <p className="font-medium">{a.vitalSigns.respiratoryRate} /min</p>
                      </div>
                    )}
                    {a.vitalSigns.oxygenSaturation && (
                      <div>
                        <span className="text-muted-foreground">SpO₂</span>
                        <p className="font-medium">{a.vitalSigns.oxygenSaturation}%</p>
                      </div>
                    )}
                    {a.vitalSigns.muac && (
                      <div>
                        <span className="text-muted-foreground">MUAC</span>
                        <p className="font-medium">{a.vitalSigns.muac} cm</p>
                      </div>
                    )}
                    {a.vitalSigns.weight && (
                      <div>
                        <span className="text-muted-foreground">Wt</span>
                        <p className="font-medium">{a.vitalSigns.weight} kg</p>
                      </div>
                    )}
                    {a.vitalSigns.painScale !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Pain</span>
                        <p className="font-medium">{a.vitalSigns.painScale}/10</p>
                      </div>
                    )}
                  </div>
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
                        const s = v as "none" | "pending" | "active" | "awaiting_feedback" | "feedback_received" | "resolved";
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
                        <SelectItem value="awaiting_feedback">Awaiting feedback</SelectItem>
                        <SelectItem value="feedback_received">Feedback received</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    {a.referralFeedback && (a.referralStatus === "feedback_received" || a.referralStatus === "resolved") && (
                      <div className="mt-2 w-full rounded-xl border bg-muted/20 p-3 text-xs">
                        <p className="font-medium text-foreground">Referral feedback</p>
                        {a.referralFeedback.facilityName && (
                          <p className="mt-1 text-muted-foreground">Facility: {a.referralFeedback.facilityName}</p>
                        )}
                        {a.referralFeedback.diagnosis && (
                          <p className="text-muted-foreground">Diagnosis: {a.referralFeedback.diagnosis}</p>
                        )}
                        {a.referralFeedback.treatment && (
                          <p className="text-muted-foreground">Treatment: {a.referralFeedback.treatment}</p>
                        )}
                        {a.referralFeedback.notes && (
                          <p className="mt-1 italic text-muted-foreground">{a.referralFeedback.notes}</p>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => {
                        setFeedbackAssessmentId(a.id);
                        setFeedbackDiagnosis(a.referralFeedback?.diagnosis ?? "");
                        setFeedbackTreatment(a.referralFeedback?.treatment ?? "");
                        setFeedbackFacility(a.referralFeedback?.facilityName ?? "");
                        setFeedbackOutcome(a.referralFeedback?.outcome ?? "unknown");
                        setFeedbackNotes(a.referralFeedback?.notes ?? "");
                        setFeedbackDialogOpen(true);
                      }}
                    >
                      <FileDown className="h-3.5 w-3.5" /> Feedback
                    </Button>
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

        {/* Follow-ups section */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t("followUps")}</h2>
          <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Calendar className="h-4 w-4" /> {t("scheduleFollowUp")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("scheduleFollowUp")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="followup-date">{t("scheduleFor")}</Label>
                  <Input
                    id="followup-date"
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="followup-notes">{t("followUpNotes")}</Label>
                  <Textarea
                    id="followup-notes"
                    value={scheduleNotes}
                    onChange={(e) => setScheduleNotes(e.target.value)}
                    placeholder={t("followUpNotesPlaceholder")}
                    rows={3}
                  />
                </div>
                <Button onClick={handleSchedule} disabled={!scheduleDate} className="w-full gap-2">
                  <Calendar className="h-4 w-4" /> {t("scheduleFollowUp")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {followUps.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("noFollowUps")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {followUps.map((f) => {
              const dueDate = new Date(f.scheduledFor);
              const past = isPast(dueDate) && f.status === "pending";
              const today = isToday(dueDate);
              return (
                <li
                  key={f.id}
                  className={`rounded-2xl border p-4 ${
                    past ? "border-red-200 bg-red-50" : "bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {format(dueDate, "PPp")}
                        </span>
                        {f.status === "completed" && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle2 className="h-3 w-3" /> Done
                          </span>
                        )}
                        {f.status === "cancelled" && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="h-3 w-3" /> Cancelled
                          </span>
                        )}
                        {past && f.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                            <Clock className="h-3 w-3" /> {t("overdue")}
                          </span>
                        )}
                        {today && f.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <Clock className="h-3 w-3" /> {t("dueToday")}
                          </span>
                        )}
                      </div>
                      {f.notes && (
                        <p className="mt-1 text-sm text-muted-foreground">{f.notes}</p>
                      )}
                    </div>
                    {f.status === "pending" && (
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleComplete(f.id)}
                        >
                          <CheckCircle2 className="h-3 w-3" /> {t("markCompleted")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-xs"
                          onClick={() => handleCancel(f.id)}
                        >
                          <XCircle className="h-3 w-3" /> {t("cancelFollowUp")}
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Referral feedback dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record referral feedback</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Facility name</Label>
                <Input
                  value={feedbackFacility}
                  onChange={(e) => setFeedbackFacility(e.target.value)}
                  placeholder="e.g. Bondo Health Centre"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Clinic diagnosis</Label>
                <Input
                  value={feedbackDiagnosis}
                  onChange={(e) => setFeedbackDiagnosis(e.target.value)}
                  placeholder="e.g. Cellulitis"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Treatment given</Label>
                <Input
                  value={feedbackTreatment}
                  onChange={(e) => setFeedbackTreatment(e.target.value)}
                  placeholder="e.g. Antibiotics prescribed"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outcome</Label>
                <Select value={feedbackOutcome} onValueChange={(v) => setFeedbackOutcome(v as typeof feedbackOutcome)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="treated">Treated and discharged</SelectItem>
                    <SelectItem value="referred_elsewhere">Referred elsewhere</SelectItem>
                    <SelectItem value="admitted">Admitted</SelectItem>
                    <SelectItem value="discharged">Discharged</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Additional notes</Label>
                <textarea
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                  rows={3}
                  placeholder="Any other details from the clinic..."
                />
              </div>
              <Button onClick={handleSaveFeedback} className="w-full gap-2">
                Save feedback
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
