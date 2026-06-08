import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getDB } from "@/lib/db";
import { useSessionStore } from "@/stores/sessionStore";
import type { ConsultationRequest } from "@/types/trij";
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Stethoscope,
} from "lucide-react";

export const Route = createFileRoute("/_app/consultations")({
  component: ConsultationsPage,
  head: () => ({
    meta: [{ title: "Consultations" }],
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

function ConsultationsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const [requests, setRequests] = useState<ConsultationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDB().consultations
      .orderBy("createdAt")
      .reverse()
      .toArray()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...requests].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("consultationTitle")}</h1>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => navigate({ to: "/clinician/consultations" })}
        >
          <Stethoscope className="h-4 w-4" />
          {t("clinicianTitle") || "Clinician"}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center text-sm text-muted-foreground">
          <MessageSquare className="mb-2 h-8 w-8" />
          <p>{t("consultationNoRequests")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate({ to: `/consultations/${c.id}` })}
              className="w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-accent/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {user?.id === c.chwUserId ? t("consultationForPatient") : t("consultationClinicianName")}
                </p>
                {(() => { const s = STATUS_CONFIG[c.status]; const Icon = s.icon; return <span className={"inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium " + s.cls}><Icon className="h-3 w-3" />{s.label}</span>; })()}
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("consultationPriority")}: {c.priority === "urgent" ? t("consultationUrgent") : t("consultationRoutine")}
                </p>
                {c.clinicalContext.condition && (
                  <p>{t("consultationCondition")}: {c.clinicalContext.condition}</p>
                )}
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
