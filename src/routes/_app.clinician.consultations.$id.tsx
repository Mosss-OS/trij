import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useSessionStore } from "@/stores/sessionStore";
import { supabase } from "@/integrations/supabase/client";
import { getDB } from "@/lib/db";
import type { ConsultationRequest } from "@/types/trij";
import { toast } from "sonner";
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  User,
  Stethoscope,
  Image,
  Mic,
  Send,
} from "lucide-react";

export const Route = createFileRoute("/_app/clinician/consultations/$id")({
  component: ClinicianConsultationDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `Consultation ${params.id.slice(0, 8)}` }],
  }),
});

const STATUS_CONFIG: Record<string, { cls: string; icon: typeof Clock; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending" },
  assigned: { cls: "bg-blue-100 text-blue-700", icon: Loader2, label: "Assigned" },
  in_progress: { cls: "bg-violet-100 text-violet-700", icon: Loader2, label: "In Progress" },
  completed: { cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Completed" },
  cancelled: { cls: "bg-gray-100 text-gray-500", icon: AlertCircle, label: "Cancelled" },
};

interface SupabaseConsultation {
  id: string;
  patient_id: string;
  chw_user_id: string;
  chw_name: string;
  status: string;
  priority: string;
  images: string[] | null;
  voice_transcript: string | null;
  chw_notes: string;
  clinical_context: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  created_at: string;
  responded_at: string | null;
  version: number;
}

function ClinicianConsultationDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams({ from: "/_app/clinician/consultations/$id" });
  const user = useSessionStore((s) => s.user);
  const [consultation, setConsultation] = useState<SupabaseConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [advice, setAdvice] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [additionalTests, setAdditionalTests] = useState("");
  const [prescription, setPrescription] = useState("");

  const canRespond = consultation && ["assigned", "in_progress"].includes(consultation.status);

  const loadConsultation = async () => {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) {
      setConsultation(data as unknown as SupabaseConsultation);
      if (data.response) {
        const r = data.response as Record<string, unknown>;
        setAdvice((r.advice as string) || "");
        setDiagnosis((r.diagnosis as string) || "");
        setAdditionalTests((r.additionalTests as string) || "");
        setPrescription((r.prescription as string) || "");
      }
    } else {
      const local = await getDB().consultations.get(id);
      if (local) {
        setConsultation(local as unknown as SupabaseConsultation);
        const r = local.response;
        if (r) {
          setAdvice(r.advice || "");
          setDiagnosis(r.diagnosis || "");
          setAdditionalTests(r.additionalTests || "");
          setPrescription(r.prescription || "");
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadConsultation();
  }, [id]);

  const toConsultationRequest = (c: SupabaseConsultation): ConsultationRequest => ({
    id: c.id,
    patientId: c.patient_id,
    chwUserId: c.chw_user_id,
    chwName: c.chw_name,
    status: c.status as ConsultationRequest["status"],
    priority: c.priority as ConsultationRequest["priority"],
    images: c.images ?? [],
    voiceTranscript: c.voice_transcript ?? undefined,
    chwNotes: c.chw_notes,
    clinicalContext: (c.clinical_context ?? {}) as ConsultationRequest["clinicalContext"],
    response: c.response as ConsultationRequest["response"],
    createdAt: c.created_at,
    respondedAt: c.responded_at ?? undefined,
    version: c.version,
  });

  const updateStatus = async (status: string) => {
    if (!consultation) return;
    setSaving(true);
    const newVersion = consultation.version + 1;
    const { error } = await supabase
      .from("consultations")
      .update({ status, version: newVersion })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      await getDB().consultations.put({
        ...toConsultationRequest(consultation),
        status: status as ConsultationRequest["status"],
        version: newVersion,
      });
      toast.success(t("clinicianStatusUpdated") || "Status updated");
      loadConsultation();
    }
    setSaving(false);
  };

  const submitResponse = async () => {
    if (!consultation || !advice.trim()) return;
    if (!user) return;
    setSaving(true);
    const now = new Date().toISOString();
    const responseData = {
      advice: advice.trim(),
      diagnosis: diagnosis.trim() || undefined,
      additionalTests: additionalTests.trim() || undefined,
      prescription: prescription.trim() || undefined,
      clinicianName: user.email || "Clinician",
      clinicianId: user.id,
      respondedAt: now,
    };
    const newVersion = consultation.version + 1;
    const { error } = await supabase
      .from("consultations")
      .update({
        status: "completed",
        response: responseData as never,
        responded_at: now,
        version: newVersion,
      })
      .eq("id", id);
    if (error) {
      toast.error("Failed to submit response");
    } else {
      await getDB().consultations.put({
        ...toConsultationRequest(consultation),
        status: "completed",
        response: responseData,
        respondedAt: now,
        version: newVersion,
      });
      toast.success(t("clinicianResponseSaved") || "Response saved");
      loadConsultation();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center text-sm text-muted-foreground">
        <AlertCircle className="mx-auto mb-2 h-8 w-8" />
        <p>Consultation not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/clinician/consultations" })}>
          {t("backToPatients") || "Back"}
        </Button>
      </div>
    );
  }

  const hasResponse = consultation.status === "completed" && consultation.response;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/clinician/consultations" })} className="text-sm text-muted-foreground">
          <ChevronLeft className="inline h-4 w-4" /> {t("backToPatients") || "Back"}
        </button>
        <h1 className="text-lg font-bold">{t("consultationTitle")}</h1>
      </div>

      <div className="mb-4 flex items-center gap-2">
        {(() => { const s = STATUS_CONFIG[consultation.status]; const Icon = s.icon; return <span className={"inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium " + s.cls}><Icon className="h-3.5 w-3.5" />{s.label}</span>; })()}
        {consultation.priority === "urgent" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            {t("consultationUrgent")}
          </span>
        )}
      </div>

      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">{t("consultationForPatient")}</h2>
        <div className="space-y-2 text-xs">
          <p className="flex items-center gap-1">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{t("consultationClinicianName")}:</span> {consultation.chw_name}
          </p>
          <p className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("consultationRequestedAt")}: {new Date(consultation.created_at).toLocaleString()}
          </p>
        </div>

        {(consultation.images && consultation.images.length > 0) || consultation.voice_transcript ? (
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
            {consultation.images && consultation.images.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                <Image className="h-3 w-3" /> {consultation.images.length} images
              </span>
            )}
            {consultation.voice_transcript && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-700">
                <Mic className="h-3 w-3" /> Voice transcript
              </span>
            )}
          </div>
        ) : null}
      </div>

      {consultation.chw_notes && (
        <div className="mb-4 rounded-2xl border bg-muted/30 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("consultationRequest") || "CHW Notes"}
          </div>
          <p className="text-sm whitespace-pre-wrap">{consultation.chw_notes}</p>
        </div>
      )}

      {hasResponse ? (
        <ClinicianResponseView response={consultation.response} />
      ) : null}

      {canRespond && consultation.status !== "completed" && (
        <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">{t("clinicianRespond") || "Respond"}</h2>

          <div className="mb-4 flex gap-2">
            {consultation.status === "pending" && (
              <Button size="sm" onClick={() => updateStatus("assigned")} disabled={saving} className="flex-1">
                {t("clinicianAssignToMe") || "Assign to Me"}
              </Button>
            )}
            {consultation.status === "assigned" && (
              <Button size="sm" onClick={() => updateStatus("in_progress")} disabled={saving} className="flex-1">
                {t("clinicianMarkInProgress") || "Mark In Progress"}
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="mb-1 text-xs font-medium">{t("consultationResponseAdvice")} *</Label>
              <Textarea
                value={advice}
                onChange={(e) => setAdvice(e.target.value)}
                placeholder={t("clinicianResponsePlaceholder") || "Enter your clinical advice..."}
                className="min-h-[100px] resize-none"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs font-medium">{t("consultationResponseDiagnosis")}</Label>
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder={t("clinicianDiagnosisPlaceholder") || "Enter diagnosis..."}
              />
            </div>
            <div>
              <Label className="mb-1 text-xs font-medium">{t("consultationResponseTests")}</Label>
              <Textarea
                value={additionalTests}
                onChange={(e) => setAdditionalTests(e.target.value)}
                placeholder={t("clinicianTestsPlaceholder") || "Enter additional tests needed..."}
                className="min-h-[60px] resize-none"
              />
            </div>
            <div>
              <Label className="mb-1 text-xs font-medium">{t("consultationResponsePrescription")}</Label>
              <Textarea
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder={t("clinicianPrescriptionPlaceholder") || "Enter prescription details..."}
                className="min-h-[60px] resize-none"
              />
            </div>
            <Button
              onClick={submitResponse}
              disabled={saving || !advice.trim()}
              className="w-full gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("clinicianCompleteResponse") || "Submit Response"}
            </Button>
          </div>
        </div>
      )}

      {consultation.status === "pending" && !canRespond && (
        <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed text-sm text-muted-foreground">
          <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            <p>{t("consultationNoResponse")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ClinicianResponseView({ response }: { response: Record<string, unknown> | null }) {
  const { t } = useI18n();
  const r: Record<string, unknown> = response ?? {};
  return (
    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {t("consultationResponseFrom")} {String(r.clinicianName ?? "")}
          </p>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-emerald-700">{t("consultationResponseAdvice")}</p>
          <p className="whitespace-pre-wrap text-emerald-900">{String(r.advice ?? "")}</p>
        </div>
        {r.diagnosis ? (
          <div>
            <p className="text-xs font-medium text-emerald-700">{t("consultationResponseDiagnosis")}</p>
            <p className="text-emerald-900">{String(r.diagnosis)}</p>
          </div>
        ) : null}
        {r.additionalTests ? (
          <div>
            <p className="text-xs font-medium text-emerald-700">{t("consultationResponseTests")}</p>
            <p className="text-emerald-900">{String(r.additionalTests)}</p>
          </div>
        ) : null}
        {r.prescription ? (
          <div>
            <p className="text-xs font-medium text-emerald-700">{t("consultationResponsePrescription")}</p>
            <p className="whitespace-pre-wrap text-emerald-900">{String(r.prescription)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
