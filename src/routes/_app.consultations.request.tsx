import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useSessionStore } from "@/stores/sessionStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getDB } from "@/lib/db";
import { queueConsultation } from "@/lib/sync";
import { toast } from "sonner";
import type { ConsultationRequest, VitalSigns, PossibleCondition } from "@/types/trij";
import {
  ChevronLeft,
  Send,
  AlertTriangle,
  Loader2,
  Image,
  Activity,
  Mic,
} from "lucide-react";

export const Route = createFileRoute("/_app/consultations/request")({
  component: ConsultationRequestPage,
  validateSearch: (search: Record<string, unknown>) => ({
    patientId: (search.patientId as string) || "",
    assessmentId: (search.assessmentId as string) || "",
    condition: (search.condition as string) || "",
    urgency: (search.urgency as string) || "",
    images: (search.images as string[]) || [],
    vitals: search.vitals as VitalSigns | undefined,
    possibleConditions: search.possibleConditions as PossibleCondition[] | undefined,
    voiceTranscript: (search.voiceTranscript as string) || "",
  }),
  head: () => ({
    meta: [{ title: "Request Consultation" }],
  }),
});

function ConsultationRequestPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const search = useSearch({ from: "/_app/consultations/request" });
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<"routine" | "urgent">("routine");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user || !notes.trim()) return;
    setSaving(true);
    try {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const c: ConsultationRequest = {
        id,
        patientId: search.patientId || "unknown",
        assessmentId: search.assessmentId || undefined,
        chwUserId: user.id,
        chwName: user.email || "CHW",
        status: "pending",
        priority,
        images: search.images || [],
        voiceTranscript: search.voiceTranscript || undefined,
        chwNotes: notes.trim(),
        clinicalContext: {
          condition: search.condition || undefined,
          urgency: search.urgency || undefined,
          vitals: search.vitals || undefined,
          possibleConditions: search.possibleConditions || undefined,
        },
        createdAt: now,
        version: 1,
      };
      await queueConsultation(c);
      toast.success(t("consultationSent"));
      navigate({ to: "/consultations" });
    } catch {
      toast.error("Failed to send consultation request");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center text-sm text-muted-foreground">
        <AlertTriangle className="mx-auto mb-2 h-8 w-8" />
        <p>Please sign in to request a consultation</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/consultations" })} className="text-sm text-muted-foreground">
          <ChevronLeft className="inline h-4 w-4" /> {t("backToPatients") || "Back"}
        </button>
        <h1 className="text-xl font-bold">{t("consultationNew")}</h1>
      </div>

      <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold">{t("consultationUploadForm")}</h2>

        {search.condition && (
          <div className="mb-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
            <span className="font-medium">{t("consultationCondition")}:</span> {search.condition}
            {search.urgency && (
              <span className="ml-2">· {t("consultationUrgency")}: {search.urgency}</span>
            )}
          </div>
        )}

        <div className="mb-3 flex flex-wrap gap-2">
          {search.images && search.images.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
              <Image className="h-3 w-3" /> {search.images.length} images
            </span>
          )}
          {search.vitals && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs text-green-700">
              <Activity className="h-3 w-3" /> Vitals
            </span>
          )}
          {search.voiceTranscript && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-700">
              <Mic className="h-3 w-3" /> Voice transcript
            </span>
          )}
        </div>

        <div className="mb-3">
          <Label className="mb-1 text-xs font-medium">{t("consultationPriority")}</Label>
          <div className="flex gap-2">
            <Button
              variant={priority === "routine" ? "default" : "outline"}
              size="sm"
              onClick={() => setPriority("routine")}
              className="flex-1"
            >
              {t("consultationRoutine")}
            </Button>
            <Button
              variant={priority === "urgent" ? "destructive" : "outline"}
              size="sm"
              onClick={() => setPriority("urgent")}
              className="flex-1"
            >
              {t("consultationUrgent")}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Label className="mb-1 text-xs font-medium">{t("consultationNotes")}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("consultationNotesPlaceholder")}
            className="min-h-[120px] resize-none"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving || !notes.trim()}
          className="w-full gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {saving ? t("consultationSending") : t("consultationSubmit")}
        </Button>
      </div>
    </div>
  );
}
