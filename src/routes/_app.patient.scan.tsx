import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { QrScanner } from "@/components/QrScanner";
import { getRecords, addDoctorRecord, type DoctorRecordInput } from "@/lib/patient-records";
import { QrCode, ShieldCheck, ChevronLeft, Check, Hospital, User, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/_app/patient/scan")({
  component: ScanPage,
  head: () => ({
    meta: [{ title: "Scan Patient QR" }],
  }),
});

function ScanPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState<"scan" | "loading" | "result" | "append">("scan");
  const [patientData, setPatientData] = useState<{ patientId: string; recordCount: number; summary: string; updatedAt: string } | null>(null);
  const [records, setRecords] = useState<{ id: string; date: string; complaint: string; notes?: string; medications?: string; facility?: string; addedBy: string }[]>([]);
  const [appendForm, setAppendForm] = useState<DoctorRecordInput>({
    diagnosis: "",
    notes: "",
    medications: "",
    facility: "",
    doctorName: "",
    licenseId: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveDone, setSaveDone] = useState(false);

  const handleScan = async (data: string) => {
    setStep("loading");
    try {
      const payload = JSON.parse(data);
      if (!payload.patientId || payload.version !== 1) {
        setStep("scan");
        return;
      }
      setPatientData(payload);
      const all = await getRecords();
      const patientRecords = all.filter((r) => r.id);
      setRecords(patientRecords.slice(0, 20));
      setStep("result");
    } catch {
      setStep("scan");
    }
  };

  const handleAppend = async () => {
    if (!patientData) return;
    setSaving(true);
    try {
      await addDoctorRecord(patientData.patientId, appendForm);
      setSaveDone(true);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="flex items-center gap-3 border-b border-amber-200 bg-white/80 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate({ to: "/patient" })} className="text-sm text-amber-600">
          <ChevronLeft className="inline h-4 w-4" /> {t("backToPatients")}
        </button>
        <h1 className="text-lg font-bold text-amber-900">
          {t("qrScanTitle") || "Scan Patient Card"}
        </h1>
      </div>

      <div className="mx-auto max-w-md px-4 py-4">
        {step === "scan" && (
          <div>
            <p className="mb-3 text-center text-sm text-amber-700">
              {t("qrScanDesc") || "Point the camera at the patient's QR card"}
            </p>
            <QrScanner onScan={handleScan} onError={() => {}} t={t as (key: string) => string} />
          </div>
        )}

        {step === "loading" && (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-amber-700">{t("loading")}</p>
          </div>
        )}

        {step === "result" && patientData && (
          <div>
            <div className="mb-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <QrCode className="h-5 w-5 text-amber-500" />
                <h2 className="font-semibold text-amber-900">{t("qrPatientSummary") || "Patient Summary"}</h2>
              </div>
              <div className="space-y-1.5 text-sm">
                <p className="text-gray-700">
                  <span className="font-medium text-amber-800">{t("qrRecords") || "Records"}:</span>{" "}
                  {patientData.recordCount}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium text-amber-800">{t("qrLastVisit") || "Last visit"}:</span>{" "}
                  {new Date(patientData.updatedAt).toLocaleDateString()}
                </p>
                {patientData.summary && (
                  <p className="text-gray-700">
                    <span className="font-medium text-amber-800">{t("qrLatestComplaint") || "Latest"}:</span>{" "}
                    {patientData.summary}
                  </p>
                )}
              </div>
            </div>

            {records.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 font-medium text-amber-800">{t("recordMyRecords")}</h3>
                <div className="space-y-2">
                  {records.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-amber-100 bg-white p-3 text-sm shadow-sm"
                    >
                      <p className="font-medium text-amber-900">{r.complaint}</p>
                      <p className="text-xs text-amber-600">
                        {new Date(r.date).toLocaleDateString()}
                        {r.addedBy === "doctor" && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-600">
                            <ShieldCheck className="h-3 w-3" /> {t("verified") || "Verified"}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!saveDone && (
              <Button
                onClick={() => setStep("append")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-600 py-3 text-base font-bold text-white hover:bg-amber-700"
              >
                <Stethoscope className="h-5 w-5" />
                {t("qrAddVisitNote") || "Add Visit Note"}
              </Button>
            )}

            {saveDone && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="font-medium text-emerald-700">{t("qrSaved") || "Visit note saved!"}</p>
              </div>
            )}
          </div>
        )}

        {step === "append" && (
          <div>
            <h2 className="mb-3 font-semibold text-amber-900">{t("qrAddVisitNote") || "Add Visit Note"}</h2>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("qrDiagnosis") || "Diagnosis"}</label>
              <textarea
                value={appendForm.diagnosis}
                onChange={(e) => setAppendForm({ ...appendForm, diagnosis: e.target.value })}
                placeholder={t("qrDiagnosisPlaceholder") || "e.g. Malaria"}
                className="min-h-[60px] w-full resize-none rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("qrNotesPlaceholder") || "Additional notes"}</label>
              <textarea
                value={appendForm.notes}
                onChange={(e) => setAppendForm({ ...appendForm, notes: e.target.value })}
                placeholder={t("qrNotesPlaceholder") || "Additional notes"}
                className="min-h-[60px] w-full resize-none rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">{t("medicationsMyMedications")}</label>
              <input
                value={appendForm.medications}
                onChange={(e) => setAppendForm({ ...appendForm, medications: e.target.value })}
                placeholder={t("qrMedsPlaceholder") || "Prescribed medications"}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">
                <Hospital className="mr-1 inline h-4 w-4" />
                {t("facilityName")}
              </label>
              <input
                value={appendForm.facility}
                onChange={(e) => setAppendForm({ ...appendForm, facility: e.target.value })}
                placeholder={t("qrFacilityPlaceholder") || "Your clinic or hospital name"}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-amber-700">
                <User className="mr-1 inline h-4 w-4" />
                {t("qrDoctorName") || "Your name"}
              </label>
              <input
                value={appendForm.doctorName}
                onChange={(e) => setAppendForm({ ...appendForm, doctorName: e.target.value })}
                placeholder={t("qrDoctorNamePlaceholder") || "Dr. ..."}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-amber-700">
                {t("qrLicenseId") || "License ID (optional)"}
              </label>
              <input
                value={appendForm.licenseId}
                onChange={(e) => setAppendForm({ ...appendForm, licenseId: e.target.value })}
                placeholder={t("qrLicensePlaceholder") || "Medical license number"}
                className="w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 placeholder:text-amber-400"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("result")}
                className="flex-1 rounded-xl border-amber-300 text-amber-700"
              >
                {t("cancelOrBack")}
              </Button>
              <Button
                onClick={handleAppend}
                disabled={saving || !appendForm.diagnosis.trim() || !appendForm.doctorName.trim() || !appendForm.facility.trim()}
                className="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? t("loading") : t("save")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
