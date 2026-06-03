import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  isPinSet,
  isPinLocked,
  setupPatientPin,
  verifyPatientPin,
  lockRecords,
  unlockWithKey,
  addRecord,
  getRecords,
  deleteRecord,
  getRecordCount,
  isKeyCached,
  type HealthRecord,
  type PatientRecordInput,
} from "@/lib/patient-records";
import {
  Lock,
  Unlock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Stethoscope,
  Home,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/patient/record")({
  component: PatientRecordPage,
  head: () => ({
    meta: [{ title: "Health Records" }],
  }),
});

function PatientRecordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<"pin" | "locked" | "records">("pin");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [mode, setMode] = useState<"unlock" | "setup">("unlock");
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pinError, setPinError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<PatientRecordInput>({
    type: "manual",
    complaint: "",
    urgencyLevel: "green",
    notes: "",
    medications: "",
    facility: "",
  });

  useEffect(() => {
    if (isKeyCached() && unlockWithKey()) {
      setScreen("records");
      loadRecords();
    } else if (isPinSet()) {
      if (isPinLocked()) {
        setScreen("locked");
      } else {
        setMode("unlock");
        setScreen("pin");
      }
    } else {
      setMode("setup");
      setScreen("pin");
    }
  }, []);

  const loadRecords = async () => {
    try {
      const all = await getRecords();
      setRecords(all);
    } catch {
      setRecords([]);
    }
  };

  const handlePinSubmit = async () => {
    setPinError("");
    if (pin.length !== 6) {
      setPinError("PIN must be 6 digits");
      return;
    }
    setLoading(true);
    try {
      if (mode === "setup") {
        if (pin !== confirmPin) {
          setPinError("PINs do not match");
          setLoading(false);
          return;
        }
        await setupPatientPin(pin);
        await verifyPatientPin(pin);
        setScreen("records");
        loadRecords();
      } else {
        const ok = await verifyPatientPin(pin);
        if (ok) {
          setScreen("records");
          loadRecords();
        } else {
          if (isPinLocked()) {
            setScreen("locked");
          } else {
            setPinError("Incorrect PIN. " + (5 - getRetryCount()) + " attempts remaining.");
          }
        }
      }
    } catch (e: unknown) {
      setPinError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const getRetryCount = () => {
    try {
      const val = localStorage.getItem("trij-patient-pin-attempts");
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  };

  const handleLock = () => {
    lockRecords();
    setPin("");
    setMode("unlock");
    setScreen("pin");
  };

  const handleAddRecord = async () => {
    if (!formData.complaint.trim()) return;
    setLoading(true);
    try {
      await addRecord(formData);
      setShowForm(false);
      setFormData({ type: "manual", complaint: "", urgencyLevel: "green", notes: "", medications: "", facility: "" });
      loadRecords();
    } catch {
      setPinError("Failed to save record");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      loadRecords();
    } catch {
      /* noop */
    }
  };

  const getUrgencyBadge = (u: string) => {
    switch (u) {
      case "red": return "bg-red-100 text-red-800 border-red-300";
      case "yellow": return "bg-amber-100 text-amber-800 border-amber-300";
      case "green": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "triage": return AlertTriangle;
      case "prescription": return FileText;
      default: return Stethoscope;
    }
  };

  if (screen === "locked") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-amber-50 p-6">
        <div className="mx-auto max-w-sm text-center">
          <Lock className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold text-amber-900">{t("accessDenied")}</h1>
          <p className="mb-6 text-amber-700">
            Too many incorrect attempts. Your records are locked.
          </p>
          <Button
            onClick={() => {
              localStorage.removeItem("trij-patient-pin-attempts");
              localStorage.removeItem("trij-patient-pin-hash");
              setMode("setup");
              setScreen("pin");
            }}
            variant="outline"
            className="border-amber-300 text-amber-700"
          >
            {t("setup")} {t("offlinePin")}
          </Button>
        </div>
      </div>
    );
  }

  if (screen === "pin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-white p-6">
        <div className="mx-auto w-full max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-amber-900">
            {mode === "setup" ? t("setup") + " PIN" : t("patientPinPrompt")}
          </h1>
          <p className="mb-6 text-sm text-amber-600">
            {mode === "setup"
              ? "Create a 6-digit PIN to protect your health records"
              : "Enter your 6-digit PIN to access your health records"}
          </p>

          <div className="mb-4 flex justify-center gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex h-4 w-4 rounded-full border-2 transition-colors",
                  i < pin.length
                    ? "border-amber-500 bg-amber-500"
                    : "border-amber-300 bg-white",
                )}
              />
            ))}
          </div>

          <div className="mx-auto mb-6 grid max-w-[280px] grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => setPin((p) => (p.length < 6 ? p + n : p))}
                className="flex h-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-2xl font-bold text-amber-900 shadow-sm transition-all hover:border-amber-400 active:scale-95"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              onClick={() => setPin((p) => (p.length < 6 ? p + "0" : p))}
              className="flex h-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-2xl font-bold text-amber-900 shadow-sm transition-all hover:border-amber-400 active:scale-95"
            >
              0
            </button>
            <button
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="flex h-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-xl text-amber-600 shadow-sm transition-all hover:border-amber-400 active:scale-95"
            >
              ⌫
            </button>
          </div>

          {mode === "setup" && pin.length === 6 && (
            <div className="mb-4">
              <label className="mb-2 block text-left text-sm font-medium text-amber-800">
                Confirm PIN
              </label>
              <div className="mb-4 flex justify-center gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex h-4 w-4 rounded-full border-2 transition-colors",
                      i < confirmPin.length
                        ? "border-amber-500 bg-amber-500"
                        : "border-amber-300 bg-white",
                    )}
                  />
                ))}
              </div>
              <div className="mx-auto mb-4 grid max-w-[280px] grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfirmPin((p) => (p.length < 6 ? p + n : p))}
                    className="flex h-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-2xl font-bold text-amber-900 shadow-sm transition-all hover:border-amber-400 active:scale-95"
                  >
                    {n}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => setConfirmPin((p) => (p.length < 6 ? p + "0" : p))}
                  className="flex h-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-2xl font-bold text-amber-900 shadow-sm transition-all hover:border-amber-400 active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={() => setConfirmPin((p) => p.slice(0, -1))}
                  className="flex h-16 items-center justify-center rounded-2xl border-2 border-amber-200 bg-white text-xl text-amber-600 shadow-sm transition-all hover:border-amber-400 active:scale-95"
                >
                  ⌫
                </button>
              </div>
            </div>
          )}

          {pinError && (
            <p className="mb-4 text-sm text-red-600">{pinError}</p>
          )}

          <Button
            onClick={handlePinSubmit}
            disabled={
              loading || pin.length !== 6 || (mode === "setup" && confirmPin.length !== 6)
            }
            className="h-14 w-full max-w-[280px] rounded-2xl bg-amber-600 text-base font-bold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? t("loading") : mode === "setup" ? t("setup") : t("unlock")}
          </Button>

          <div className="mt-6">
            <Button
              variant="ghost"
              className="text-amber-600"
              onClick={() => navigate({ to: "/patient" })}
            >
              ← {t("backToPatients")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const count = records.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="flex items-center justify-between border-b border-amber-200 bg-white/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/patient" })}
          className="text-sm text-amber-600"
        >
          ← {t("backToPatients")}
        </button>
        <h1 className="text-lg font-bold text-amber-900">{t("recordMyRecords")}</h1>
        <button onClick={handleLock} className="text-sm text-amber-600">
          <Lock className="inline h-4 w-4" /> {t("lock")}
        </button>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-amber-700">
            {count} {t("records") || "records"}
          </p>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            <Plus className="h-4 w-4" />
            {t("recordAddEntry")}
          </Button>
        </div>

        {showForm && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-amber-800">{t("recordAddEntry")}</h3>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("type")}</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as "manual" | "triage" | "prescription" })
                }
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <option value="manual">{t("recordAddEntry")}</option>
                <option value="triage">{t("triageShort")}</option>
                <option value="prescription">{t("prescription") || "Prescription"}</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("symptoms")}</label>
              <textarea
                value={formData.complaint}
                onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                placeholder="e.g. headache, fever"
                className="min-h-[60px] w-full resize-none rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("status")}</label>
              <select
                value={formData.urgencyLevel}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    urgencyLevel: e.target.value as "red" | "yellow" | "green" | "unknown",
                  })
                }
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                <option value="green">{t("triageResultWait")}</option>
                <option value="yellow">{t("triageResultClinic")}</option>
                <option value="red">{t("triageResultEmergency")}</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("notes")}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                className="min-h-[60px] w-full resize-none rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 placeholder:text-amber-400"
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
                onClick={handleAddRecord}
                disabled={loading || !formData.complaint.trim()}
                className="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {loading ? t("loading") : t("save")}
              </Button>
            </div>
          </div>
        )}

        {count === 0 && !showForm && (
          <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
            <FileText className="mx-auto mb-3 h-12 w-12 text-amber-300" />
            <p className="text-amber-700">{t("noRecords") || "No health records yet"}</p>
            <p className="mt-1 text-sm text-amber-500">
              {t("tapToAdd") || "Tap \"Add entry\" to create your first record"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {records.map((record) => {
            const isExpanded = expandedId === record.id;
            const TypeIcon = getTypeIcon(record.type);
            return (
              <div
                key={record.id}
                className="rounded-2xl border border-amber-200 bg-white shadow-sm transition-all"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <TypeIcon className="h-8 w-8 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-amber-900">
                      {record.complaint}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="h-3 w-3" />
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                      getUrgencyBadge(record.urgencyLevel),
                    )}
                  >
                    {record.urgencyLevel}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-amber-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-amber-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-amber-100 px-4 pb-4 pt-3">
                    {record.medications && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-amber-700">{t("medicationsMyMedications")}:</span>
                        <p className="text-sm text-gray-700">{record.medications}</p>
                      </div>
                    )}
                    {record.notes && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-amber-700">{t("notes")}:</span>
                        <p className="text-sm text-gray-700">{record.notes}</p>
                      </div>
                    )}
                    {record.facility && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-amber-700">{t("facilityName")}:</span>
                        <p className="text-sm text-gray-700">{record.facility}</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="mt-2 flex items-center gap-1 text-sm text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("delete")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
