import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { ConsultationRequest } from "@/types/trij";
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/_app/clinician/consultations")({
  component: ClinicianConsultationsPage,
  head: () => ({
    meta: [{ title: "Clinician Dashboard" }],
  }),
});

const STATUS_ORDER: ConsultationRequest["status"][] = [
  "pending", "assigned", "in_progress", "completed", "cancelled",
];

const STATUS_CONFIG: Record<ConsultationRequest["status"], { cls: string; icon: typeof Clock; label: string }> = {
  pending: { cls: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Pending" },
  assigned: { cls: "bg-blue-100 text-blue-700 border-blue-200", icon: Loader2, label: "Assigned" },
  in_progress: { cls: "bg-violet-100 text-violet-700 border-violet-200", icon: Loader2, label: "In Progress" },
  completed: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Completed" },
  cancelled: { cls: "bg-gray-100 text-gray-500 border-gray-200", icon: AlertCircle, label: "Cancelled" },
};

interface SupabaseConsultation {
  id: string;
  patient_id: string;
  chw_user_id: string;
  chw_name: string;
  status: string;
  priority: string;
  chw_notes: string;
  clinical_context: unknown;
  created_at: string;
}

function ClinicianConsultationsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<SupabaseConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setConsultations(data as unknown as SupabaseConsultation[]);
        setLoading(false);
      });
  }, []);

  const sorted = [...consultations].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status as ConsultationRequest["status"]) - STATUS_ORDER.indexOf(b.status as ConsultationRequest["status"]),
  );

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/consultations" })} className="text-sm text-muted-foreground">
            <ArrowLeft className="inline h-4 w-4" /> {t("backToPatients") || "Back"}
          </button>
          <h1 className="text-xl font-bold">{t("clinicianTitle") || "Clinician Dashboard"}</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center text-sm text-muted-foreground">
          <MessageSquare className="mb-2 h-8 w-8" />
          <p>{t("clinicianNoConsultations") || "No consultation requests yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: `/clinician/consultations/${c.id}` } as any)}
              className="w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">{c.chw_name}</p>
                </div>
                {(() => { const s = STATUS_CONFIG[c.status as ConsultationRequest["status"]]; const Icon = s.icon; return <span className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium " + s.cls}><Icon className="h-3 w-3" />{s.label}</span>; })()}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("consultationPriority")}: {c.priority === "urgent" ? t("consultationUrgent") : t("consultationRoutine")}
                </p>
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(c.created_at).toLocaleDateString()} {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
