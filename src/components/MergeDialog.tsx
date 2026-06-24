import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { mergePatients, type MatchScore } from "@/lib/dedup";
import type { Patient } from "@/types/trij";
import { GitMerge, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props {
  match: MatchScore;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}

export function MergeDialog({ match, open, onOpenChange, onMerged }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<"a" | "b">("a");

  const patientA = match.patientA;
  const patientB = match.patientB;
  const primary = selected === "a" ? patientA : patientB;
  const secondary = selected === "a" ? patientB : patientA;

  const handleMerge = async () => {
    setBusy(true);
    try {
      await mergePatients(primary, secondary);
      toast.success(t("patientsMerged"));
      onMerged();
      onOpenChange(false);
    } catch (err) {
      toast.error(t("mergeFailed") + (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            {t("mergeTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("mergeDesc")} ({Math.round(match.score * 100)}%).
            {t("mergeHistory")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 text-sm">
          <p className="font-medium text-muted-foreground">{t("matchingReasons")}:</p>
          <ul className="space-y-1">
            {match.reasons.map((r, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 text-urgency-yellow" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <PatientCard
            patient={patientA}
            selected={selected === "a"}
            onSelect={() => setSelected("a")}
          />
          <PatientCard
            patient={patientB}
            selected={selected === "b"}
            onSelect={() => setSelected("b")}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleMerge} disabled={busy}>
            {busy ? "Merging..." : "Merge"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PatientCard({
  patient,
  selected,
  onSelect,
}: {
  patient: Patient;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition-colors ${
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:bg-accent/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{patient.identifier || "Unknown"}</p>
        {selected && <span className="text-xs font-medium text-primary">Keep</span>}
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        <p>Age: {patient.ageYears ?? "?"}</p>
        <p>Sex: {patient.sex ?? "?"}</p>
        <p>Created: {new Date(patient.createdAt).toLocaleDateString()}</p>
      </div>
    </button>
  );
}
