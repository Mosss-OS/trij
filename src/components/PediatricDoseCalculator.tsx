import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Pill,
  Droplets,
  Activity,
  FileText,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import pediatricDosingData from "@/data/pediatric-dosing.json";

interface Medication {
  id: string;
  name: string;
  formulations: Formulation[];
  contraindications: string[];
  warnings: string[];
}

interface Formulation {
  form: string;
  concentration: string;
  dosePerKg?: string;
  doseUnit?: string;
  frequency: string;
  maxDailyDosePerKg?: string;
  maxDailyDoseUnit?: string;
  dose?: string;
  minAge?: number;
  minAgeMonths?: number;
  maxAgeMonths?: number;
  minWeight?: number;
  maxWeight?: number;
  volumePerKg?: string;
  volumeUnit?: string;
  maxDailyVolumePerKg?: string;
  maxDailyVolumeUnit?: string;
  doses?: Array<{ time: string; tablets: number }>;
  notes: string;
}

interface DoseResult {
  calculatedDose: number;
  doseUnit: string;
  volume: number;
  volumeUnit: string;
  tablets: number;
  maxDailyDose: number;
  maxDailyUnit: string;
  exceedsMax: boolean;
  warnings: string[];
}

export function PediatricDoseCalculator() {
  const { t } = useI18n();
  const medications = pediatricDosingData.medications as Medication[];

  const [weight, setWeight] = useState("");
  const [selectedMedication, setSelectedMedication] = useState<string>("");
  const [selectedFormulation, setSelectedFormulation] = useState<Formulation | null>(null);
  const [result, setResult] = useState<DoseResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const calculateDose = () => {
    if (!weight || !selectedFormulation) return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) return;

    const form = selectedFormulation;
    let calculatedDose = 0;
    let doseUnit = "";
    let volume = 0;
    let volumeUnit = "";
    let tablets = 0;
    let maxDailyDose = 0;
    let maxDailyUnit = "";
    let exceedsMax = false;
    const warnings: string[] = [];

    // Check age/weight constraints
    if (form.minWeight && weightNum < form.minWeight) {
      warnings.push(`Minimum weight for this formulation: ${form.minWeight}kg`);
    }
    if (form.maxWeight && weightNum > form.maxWeight) {
      warnings.push(`Maximum weight for this formulation: ${form.maxWeight}kg`);
    }

    // Calculate dose based on medication type
    if (selectedMedication === "ors") {
      // ORS calculation
      const volumePerKg = parseFloat(form.volumePerKg || "0");
      volume = weightNum * volumePerKg;
      volumeUnit = form.volumeUnit || "ml";
      maxDailyDose = weightNum * parseFloat(form.maxDailyVolumePerKg || "0");
      maxDailyUnit = form.maxDailyVolumeUnit || "ml";
    } else if (selectedMedication === "artemether-lumefantrine") {
      // Artemether-lumefantrine uses fixed doses based on weight
      tablets = form.doses?.[0]?.tablets || 0;
      doseUnit = "tablets";
      warnings.push(
        `6-dose regimen: ${form.doses?.map((d) => `${d.time}: ${d.tablets} tablet(s)`).join(", ")}`,
      );
    } else if (form.dose) {
      // Fixed dose (e.g., zinc)
      calculatedDose = parseFloat(form.dose);
      doseUnit = form.doseUnit || "mg";
      maxDailyDose = calculatedDose;
      maxDailyUnit = doseUnit;
    } else {
      // Weight-based calculation
      const dosePerKg = parseFloat(form.dosePerKg || "0");
      calculatedDose = weightNum * dosePerKg;
      doseUnit = form.doseUnit || "mg";

      // Calculate volume for liquid formulations
      if (form.form === "syrup" || form.form === "suspension") {
        const concMatch = form.concentration.match(/(\d+)mg\/(\d+)ml/);
        if (concMatch) {
          const mgPerMl = parseInt(concMatch[1]) / parseInt(concMatch[2]);
          volume = calculatedDose / mgPerMl;
          volumeUnit = "ml";
        }
      }

      // Calculate max daily dose
      const maxDailyDosePerKg = parseFloat(form.maxDailyDosePerKg || "0");
      maxDailyDose = weightNum * maxDailyDosePerKg;
      maxDailyUnit = form.maxDailyDoseUnit || "mg";

      // Check if exceeds max daily dose
      if (calculatedDose > maxDailyDose) {
        exceedsMax = true;
        warnings.push(
          `Calculated dose (${calculatedDose.toFixed(1)}${doseUnit}) exceeds maximum daily dose (${maxDailyDose.toFixed(1)}${maxDailyUnit})`,
        );
      }
    }

    setResult({
      calculatedDose,
      doseUnit,
      volume,
      volumeUnit,
      tablets,
      maxDailyDose,
      maxDailyUnit,
      exceedsMax,
      warnings,
    });
  };

  const selectedMed = medications.find((m) => m.id === selectedMedication);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Pediatric Dose Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Weight Input */}
          <div className="space-y-2">
            <Label htmlFor="weight">Child's Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              placeholder="e.g. 12.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          {/* Medication Selection */}
          <div className="space-y-2">
            <Label htmlFor="medication">Medication</Label>
            <select
              id="medication"
              className="w-full rounded-md border bg-background px-3 py-2"
              value={selectedMedication}
              onChange={(e) => {
                setSelectedMedication(e.target.value);
                setSelectedFormulation(null);
                setResult(null);
              }}
            >
              <option value="">Select medication...</option>
              {medications.map((med) => (
                <option key={med.id} value={med.id}>
                  {med.name}
                </option>
              ))}
            </select>
          </div>

          {/* Formulation Selection */}
          {selectedMed && (
            <div className="space-y-2">
              <Label htmlFor="formulation">Formulation</Label>
              <select
                id="formulation"
                className="w-full rounded-md border bg-background px-3 py-2"
                value={selectedFormulation?.form || ""}
                onChange={(e) => {
                  const form = selectedMed.formulations.find(
                    (f) => `${f.form} - ${f.concentration}` === e.target.value,
                  );
                  setSelectedFormulation(form || null);
                  setResult(null);
                }}
              >
                <option value="">Select formulation...</option>
                {selectedMed.formulations.map((form, index) => (
                  <option key={index} value={`${form.form} - ${form.concentration}`}>
                    {form.form} - {form.concentration}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Calculate Button */}
          <Button
            onClick={calculateDose}
            disabled={!weight || !selectedFormulation}
            className="w-full"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Calculate Dose
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.exceedsMax ? "border-red-500" : "border-green-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.exceedsMax ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              Dose Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Dose */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Calculated Dose</div>
                <div className="text-2xl font-bold">
                  {result.calculatedDose > 0 &&
                    `${result.calculatedDose.toFixed(1)} ${result.doseUnit}`}
                  {result.tablets > 0 && `${result.tablets} tablet(s)`}
                  {result.volume > 0 && `${result.volume.toFixed(1)} ${result.volumeUnit}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedFormulation?.frequency}
                </div>
              </div>
              <div className="text-right">
                {result.tablets > 0 && (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                )}
                {result.volume > 0 && (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Droplets className="h-6 w-6 text-primary" />
                  </div>
                )}
                {result.calculatedDose > 0 && result.tablets === 0 && result.volume === 0 && (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* Max Daily Dose */}
            {result.maxDailyDose > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Maximum Daily Dose: </span>
                <span className="font-medium">
                  {result.maxDailyDose.toFixed(1)} {result.maxDailyUnit}
                </span>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <Alert variant={result.exceedsMax ? "destructive" : "default"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {result.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Medication Notes */}
            {selectedFormulation && (
              <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <div className="font-medium mb-1">Notes:</div>
                <div>{selectedFormulation.notes}</div>
              </div>
            )}

            {/* Details Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              {showDetails ? "Hide" : "Show"} Safety Information
            </Button>

            {/* Safety Details */}
            {showDetails && selectedMed && (
              <div className="space-y-3 pt-3 border-t">
                <div>
                  <div className="font-medium text-sm mb-2">Contraindications:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMed.contraindications.map((contra, index) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {contra}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-sm mb-2">Warnings:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMed.warnings.map((warning, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {warning}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <Alert variant="default" className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Medical Disclaimer:</strong> This calculator is a tool to assist with dosing
          calculations. Always verify calculations and consult current drug references. Clinical
          judgment and patient-specific factors should always guide final dosing decisions.
        </AlertDescription>
      </Alert>
    </div>
  );
}
