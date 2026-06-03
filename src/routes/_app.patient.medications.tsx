import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  addMedication,
  getActiveMedications,
  getPastMedications,
  stopMedication,
  logDose,
  getTodayLogs,
  getDaysRemaining,
  needsRefill,
  getDefaultTimeSlots,
  getSlotLabel,
  type Medication,
  type DoseLog,
} from "@/lib/medications";
import {
  Pill,
  Plus,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/patient/medications")({
  component: PatientMedicationsPage,
  head: () => ({
    meta: [{ title: "Medications" }],
  }),
});

function PatientMedicationsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeMeds, setActiveMeds] = useState<Medication[]>([]);
  const [pastMeds, setPastMeds] = useState<Medication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [todayLogs, setTodayLogs] = useState<Record<string, DoseLog[]>>({});

  const [formName, setFormName] = useState("");
  const [formDosage, setFormDosage] = useState("");
  const [formFrequency, setFormFrequency] = useState<Medication["frequency"]>("once");
  const [formDuration, setFormDuration] = useState("7");
  const [formIsOngoing, setFormIsOngoing] = useState(false);
  const [formNotes, setFormNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const active = await getActiveMedications();
      setActiveMeds(active);
      const past = await getPastMedications();
      setPastMeds(past);
      const logs: Record<string, DoseLog[]> = {};
      for (const med of active) {
        logs[med.id] = await getTodayLogs(med.id);
      }
      setTodayLogs(logs);
    } catch {
      /* noop */
    }
  };

  const handleAdd = async () => {
    if (!formName.trim() || !formDosage.trim()) return;
    setLoading(true);
    try {
      await addMedication({
        name: formName.trim(),
        dosage: formDosage.trim(),
        frequency: formFrequency,
        timeSlots: getDefaultTimeSlots(formFrequency),
        durationDays: formIsOngoing ? 999 : parseInt(formDuration, 10) || 7,
        isOngoing: formIsOngoing,
        startDate: new Date().toISOString().slice(0, 10),
        notes: formNotes.trim(),
      });
      setShowForm(false);
      setFormName("");
      setFormDosage("");
      setFormFrequency("once");
      setFormDuration("7");
      setFormIsOngoing(false);
      setFormNotes("");
      loadData();
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (medId: string, slot: string) => {
    try {
      await logDose(medId, slot, true);
      loadData();
    } catch {
      /* noop */
    }
  };

  const handleStop = async (medId: string) => {
    try {
      await stopMedication(medId);
      loadData();
    } catch {
      /* noop */
    }
  };

  const isSlotTaken = (medId: string, slot: string) => {
    return (todayLogs[medId] || []).some((l) => l.scheduledSlot === slot);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="flex items-center justify-between border-b border-amber-200 bg-white/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/patient" })}
          className="text-sm text-amber-600"
        >
          ← {t("backToPatients")}
        </button>
        <h1 className="text-lg font-bold text-amber-900">{t("medicationsMyMedications")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-bold text-amber-600"
        >
          <Plus className="inline h-4 w-4" /> {t("medicationsAddReminder")}
        </button>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {showForm && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-amber-800">{t("medicationsAddReminder")}</h3>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("name") || "Name"}</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Amoxicillin"
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("dosage") || "Dosage"}</label>
              <input
                value={formDosage}
                onChange={(e) => setFormDosage(e.target.value)}
                placeholder="e.g. 500mg"
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">Frequency</label>
              <select
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value as Medication["frequency"])}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <option value="once">Once daily</option>
                <option value="twice">Twice daily</option>
                <option value="thrice">Three times daily</option>
                <option value="as-needed">As needed</option>
              </select>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-amber-700">
                <input
                  type="checkbox"
                  checked={formIsOngoing}
                  onChange={(e) => setFormIsOngoing(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 text-amber-600"
                />
                Ongoing
              </label>
              {!formIsOngoing && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-amber-700">{t("duration")}</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    min="1"
                    className="w-16 rounded-xl border border-amber-300 bg-amber-50 px-2 py-1 text-sm text-amber-900"
                  />
                  <span className="text-xs text-amber-600">{t("days") || "days"}</span>
                </div>
              )}
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("notes")}</label>
              <input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Take after food"
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-xl border-amber-300 text-amber-700"
              >
                {t("cancelOrBack")}
              </Button>
              <Button
                onClick={handleAdd}
                disabled={loading || !formName.trim() || !formDosage.trim()}
                className="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? t("loading") : t("save")}
              </Button>
            </div>
          </div>
        )}

        {activeMeds.length === 0 && !showForm && (
          <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <Pill className="mx-auto mb-3 h-12 w-12 text-amber-300" />
            <p className="text-amber-700">{t("noRecords")}</p>
            <p className="mt-1 text-sm text-amber-500">{t("tapToAdd")}</p>
          </div>
        )}

        <div className="space-y-3">
          {activeMeds.map((med) => {
            const remaining = getDaysRemaining(med);
            const refill = needsRefill(med);
            const logs = todayLogs[med.id] || [];
            const takenCount = logs.filter((l) => l.taken).length;
            const totalSlots = med.timeSlots.length;
            const progress = totalSlots > 0 ? (takenCount / totalSlots) * 100 : 0;

            return (
              <div
                key={med.id}
                className="rounded-2xl border border-amber-200 bg-white shadow-sm"
              >
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-amber-900">{med.name}</h3>
                      <p className="text-sm text-amber-600">
                        {med.dosage} — {med.frequency.replace("-", " ")}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                      <Calendar className="h-3 w-3" />
                      {med.isOngoing ? t("ongoing") || "Ongoing" : `${remaining} ${t("days") || "days"}`}
                    </span>
                  </div>

                  {refill && (
                    <div className="mb-2 flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      {med.name} {t("refill") || "needs refill"}!
                    </div>
                  )}

                  {totalSlots > 0 && (
                    <div className="mb-2">
                      <div className="mb-1 flex justify-between text-xs text-amber-600">
                        <span>{t("progress") || "Progress"}</span>
                        <span>{takenCount}/{totalSlots}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                        <div
                          className="h-full rounded-full bg-amber-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {med.timeSlots.map((slot) => {
                      const taken = isSlotTaken(med.id, slot);
                      return (
                        <button
                          key={slot}
                          onClick={() => !taken && handleMarkTaken(med.id, slot)}
                          disabled={taken}
                          className={cn(
                            "flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                            taken
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700 hover:bg-amber-200",
                          )}
                        >
                          {taken && <Check className="h-3 w-3" />}
                          {getSlotLabel(slot)}
                        </button>
                      );
                    })}
                  </div>

                  {med.notes && (
                    <p className="mb-2 text-xs text-gray-500">{med.notes}</p>
                  )}

                  <button
                    onClick={() => handleStop(med.id)}
                    className="text-xs text-red-500"
                  >
                    {t("stop") || "Stop medication"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {pastMeds.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowPast(!showPast)}
              className="flex w-full items-center justify-between rounded-xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-700"
            >
              {t("pastMedications") || "Past medications"} ({pastMeds.length})
              {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPast && (
              <div className="mt-2 space-y-2">
                {pastMeds.map((med) => (
                  <div
                    key={med.id}
                    className="rounded-xl border border-amber-200 bg-white/70 p-3"
                  >
                    <p className="font-medium text-amber-800">{med.name}</p>
                    <p className="text-xs text-amber-500">
                      {med.dosage} — {t("completed") || "Completed"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
