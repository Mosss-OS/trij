import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { I18nErrorBoundary } from "@/components/ErrorBoundary";
import { useSessionStore } from "@/stores/sessionStore";
import { useI18n } from "@/lib/i18n";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronLeft, Save, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { queuePatient } from "@/lib/sync";
import { getCurrentPosition } from "@/lib/geolocation";
import type { Patient, Sex } from "@/types/trij";

export const Route = createFileRoute("/_app/patients/batch-register")({
  head: () => ({
    meta: [
      {
        title: "Batch Patient Registration | Trij Free Medical Triage",
      },
      {
        name: "description",
        content:
          "Register multiple patients at once for community screening events. Quick-entry form for efficient patient registration — all offline.",
      },
    ],
  }),
  component: () => (
    <I18nErrorBoundary kind="database">
      <BatchRegister />
    </I18nErrorBoundary>
  ),
});

interface BatchPatientRow {
  id: string;
  identifier: string;
  ageYears: string;
  sex: Sex;
}

function BatchRegister() {
  const { t } = useI18n();
  const user = useSessionStore((s) => s.user);
  const { log } = useAuditLog();
  const [rows, setRows] = useState<BatchPatientRow[]>([
    { id: crypto.randomUUID(), identifier: "", ageYears: "", sex: "F" },
  ]);
  const [commonVillage, setCommonVillage] = useState("");
  const [commonHousehold, setCommonHousehold] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");

  const addRow = () => {
    const lastRow = rows[rows.length - 1];
    let newIdentifier = "";
    
    // Auto-generate sequential ID based on last row
    if (lastRow && lastRow.identifier) {
      const match = lastRow.identifier.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        const prefix = lastRow.identifier.replace(/\d+$/, "");
        newIdentifier = prefix + num.toString().padStart(match[1].length, "0");
      }
    }
    
    setRows([
      ...rows,
      { id: crypto.randomUUID(), identifier: newIdentifier, ageYears: "", sex: "F" },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof BatchPatientRow, value: string) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const applyCommonValues = () => {
    setRows(
      rows.map((row) => ({
        ...row,
        identifier: commonVillage ? `${commonVillage}-${row.identifier.split("-").pop() || "001"}` : row.identifier,
      })),
    );
  };

  const generateSequentialIds = () => {
    const prefix = commonVillage || "P";
    setRows(
      rows.map((row, index) => ({
        ...row,
        identifier: `${prefix}-${(index + 1).toString().padStart(3, "0")}`,
      })),
    );
  };

  const handleSubmit = async () => {
    if (!user) return;

    const validRows = rows.filter((row) => row.identifier.trim() && row.ageYears);
    if (validRows.length === 0) {
      toast.error(t("batchRegisterNoValidRows"));
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    setProgressText("");

    let successCount = 0;
    let errorCount = 0;

    // Get location once for all patients
    const coords = await getCurrentPosition();

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgressText(`${t("batchRegisterProgress")} ${i + 1} of ${validRows.length}`);
      setProgress(((i + 1) / validRows.length) * 100);

      try {
        const patient: Patient = {
          id: crypto.randomUUID(),
          chwUserId: user.id,
          identifier: row.identifier.trim(),
          ageYears: row.ageYears ? Number(row.ageYears) : undefined,
          sex: row.sex,
          locationLat: coords?.lat,
          locationLng: coords?.lng,
          notes: commonHousehold ? `Household: ${commonHousehold}` : undefined,
          version: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await queuePatient(patient);
        log("patient:create", { resourceType: "patient", resourceId: patient.id, patientId: patient.id });
        successCount++;
      } catch (error) {
        console.error("Failed to create patient:", error);
        errorCount++;
      }
    }

    setIsSubmitting(false);
    setProgressText("");

    if (successCount > 0) {
      toast.success(`${t("batchRegisterSuccess")} ${successCount} ${successCount === 1 ? t("patient") : t("patients")}`);
      // Reset form
      setRows([{ id: crypto.randomUUID(), identifier: "", ageYears: "", sex: "F" }]);
      setCommonVillage("");
      setCommonHousehold("");
    }

    if (errorCount > 0) {
      toast.error(`${t("batchRegisterErrors")} ${errorCount}`);
    }
  };

  return (
    <>
      <AppHeader title={t("batchRegister")} subtitle={t("batchRegisterDesc")} />
      <div className="mx-auto max-w-4xl px-5 py-6">
        {/* Common characteristics */}
        <div className="mb-6 rounded-2xl border bg-card p-4">
          <h3 className="mb-3 font-medium">{t("batchRegisterCommonCharacteristics")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="common-village">{t("villageCode")}</Label>
              <Input
                id="common-village"
                value={commonVillage}
                onChange={(e) => setCommonVillage(e.target.value)}
                placeholder="e.g. AP"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="common-household">{t("householdId")}</Label>
              <Input
                id="common-household"
                value={commonHousehold}
                onChange={(e) => setCommonHousehold(e.target.value)}
                placeholder="e.g. HH-123"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" onClick={applyCommonValues}>
              {t("batchRegisterApplyVillage")}
            </Button>
            <Button variant="outline" size="sm" onClick={generateSequentialIds}>
              {t("batchRegisterGenerateIds")}
            </Button>
          </div>
        </div>

        {/* Batch registration table */}
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <div className="grid min-w-[500px] grid-cols-12 gap-2 border-b p-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">{t("patientIdentifier")}</div>
            <div className="col-span-3">{t("ageYears")}</div>
            <div className="col-span-3">{t("sex")}</div>
            <div className="col-span-2" />
          </div>

          {rows.map((row, index) => (
            <div key={row.id} className="grid min-w-[500px] grid-cols-12 gap-2 border-b p-3 last:border-b-0">
              <div className="col-span-4">
                <Input
                  value={row.identifier}
                  onChange={(e) => updateRow(row.id, "identifier", e.target.value)}
                  placeholder={`${commonVillage || "P"}-${(index + 1).toString().padStart(3, "0")}`}
                />
              </div>
              <div className="col-span-3">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={row.ageYears}
                  onChange={(e) => updateRow(row.id, "ageYears", e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="col-span-3">
                <div className="flex rounded-lg border p-1" role="radiogroup" aria-label={t("sex")}>
                  {(["F", "M", "other"] as const).map((s) => (
                    <button
                      key={s}
                      role="radio"
                      aria-checked={row.sex === s}
                      onClick={() => updateRow(row.id, "sex", s)}
                      className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                        row.sex === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t p-3">
            <Button variant="outline" onClick={addRow} className="w-full gap-2">
              <Plus className="h-4 w-4" /> {t("batchRegisterAddRow")}
            </Button>
          </div>
        </div>

        {/* Progress indicator */}
        {isSubmitting && (
          <div className="mt-6 rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">{progressText}</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || rows.filter((r) => r.identifier.trim() && r.ageYears).length === 0}
            size="lg"
            className="flex-1 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("batchRegisterRegistering")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {t("batchRegisterSubmit")} ({rows.filter((r) => r.identifier.trim() && r.ageYears).length})
              </>
            )}
          </Button>
          <Link to="/patients">
            <Button variant="outline" size="lg" className="gap-2">
              <ChevronLeft className="h-4 w-4" /> {t("cancel")}
            </Button>
          </Link>
        </div>

        {/* Help text */}
        <div className="mt-6 rounded-2xl border border-dashed p-4 text-center">
          <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{t("batchRegisterHelp")}</p>
        </div>
      </div>
    </>
  );
}
