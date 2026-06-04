import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getDB } from "@/lib/db";
import { useSessionStore } from "@/stores/sessionStore";
import type { ConsultationRequest } from "@/types/trij";
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  User,
  Stethoscope,
  Activity,
  Image,
  Mic,
} from "lucide-react";

export const Route = createFileRoute("/_app/consultations/$id")({
  component: ConsultationDetailPage,
  head: ({ params }) => ({
    meta: [{ title: `Consultation ${params.id.slice(0, 8)}` }],
  }),
});

const STATUS_CONFIG: Record<ConsultationRequest["status"], { cls: string; icon: typeof Clock; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-700", icon: Clock, label: "Pending" },
  assigned: { cls: "bg-blue-100 text-blue-700", icon: Loader2, label: "Assigned" },
  in_progress: { cls: "bg-violet-100 text-violet-700", icon: Loader2, label: "In Progress" },
  completed: { cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "Completed" },
  cancelled: { cls: "bg-gray-100 text-gray-500", icon: AlertCircle, label: "Cancelled" },
};

function ConsultationDetailPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams({ from: "/_app/consultations/$id" });
  const user = useSessionStore((s) => s.user);
  const [consultation, setConsultation] = useState<ConsultationRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDB().consultations.get(id).then((c) => {
      setConsultation(c ?? null);
      setLoading(false);
    });
  }, [id]);

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
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/consultations" })}>
          {t("backToPatients") || "Back"}
        </Button>
      </div>
    );
  }

  const hasResponse = consultation.status === "completed" && consultation.response;

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/consultations" })} className="text-sm text-muted-foreground">
          <ChevronLeft className="inline h-4 w-4" /> {t("backToPatients") || "Back"}
        </button>
        <h1 className="text-lg font-bold">{t("consultationTitle")}</h1>
      </div>

      {/* Status & Priority */}
      <div className="mb-4 flex items-center gap-2">
        {(() => { const s = STATUS_CONFIG[consultation.status]; const Icon = s.icon; return <span className={"inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium " + s.cls}><Icon className="h-3.5 w-3.5" />{s.label}</span>; })()}
        {consultation.priority === "urgent" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            <AlertCircle className="h-3.5 w-3.5" />
            {t("consultationUrgent")}
          </span>
        )}
      </div>

      {/* Clinical Context Card */}
      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">{t("consultationForPatient")}</h2>
        <div className="space-y-2 text-xs">
          {consultation.clinicalContext.condition && (
            <p><span className="font-medium text-muted-foreground">{t("consultationCondition")}:</span> {consultation.clinicalContext.condition}</p>
          )}
          {consultation.clinicalContext.urgency && (
            <p><span className="font-medium text-muted-foreground">{t("consultationUrgency")}:</span> {consultation.clinicalContext.urgency}</p>
          )}
          <p className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("consultationRequestedAt")}: {new Date(consultation.createdAt).toLocaleString()}
          </p>
          {consultation.respondedAt && (
            <p className="flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="h-3 w-3" />
              {t("consultationRespondedAt")}: {new Date(consultation.respondedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Attachments */}
        {(consultation.images.length > 0 || consultation.voiceTranscript) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
            {consultation.images.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                <Image className="h-3 w-3" /> {consultation.images.length} images
              </span>
            )}
            {consultation.voiceTranscript && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-700">
                <Mic className="h-3 w-3" /> Voice transcript
              </span>
            )}
          </div>
        )}
      </div>

      {/* CHW Notes */}
      <div className="mb-4 rounded-2xl border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          {t("consultationRequest") || "CHW Notes"}
        </div>
        <p className="text-sm whitespace-pre-wrap">{consultation.chwNotes}</p>
      </div>

      {/* Clinician Response */}
      {hasResponse ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                {t("consultationResponseFrom")} {consultation.response!.clinicianName}
              </p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-medium text-emerald-700">{t("consultationResponseAdvice")}</p>
              <p className="whitespace-pre-wrap text-emerald-900">{consultation.response!.advice}</p>
            </div>
            {consultation.response!.diagnosis && (
              <div>
                <p className="text-xs font-medium text-emerald-700">{t("consultationResponseDiagnosis")}</p>
                <p className="text-emerald-900">{consultation.response!.diagnosis}</p>
              </div>
            )}
            {consultation.response!.additionalTests && (
              <div>
                <p className="text-xs font-medium text-emerald-700">{t("consultationResponseTests")}</p>
                <p className="text-emerald-900">{consultation.response!.additionalTests}</p>
              </div>
            )}
            {consultation.response!.prescription && (
              <div>
                <p className="text-xs font-medium text-emerald-700">{t("consultationResponsePrescription")}</p>
                <p className="whitespace-pre-wrap text-emerald-900">{consultation.response!.prescription}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-[10px] text-emerald-500">
            {new Date(consultation.response!.respondedAt).toLocaleString()}
          </p>
        </div>
      ) : consultation.status !== "cancelled" ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed text-sm text-muted-foreground">
          <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            <p>{t("consultationNoResponse")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
