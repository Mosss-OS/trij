import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UrgencyPill } from "@/components/UrgencyPill";
import {
  assessMaternal,
  getFundalHeightGuide,
  type MaternalPhase,
  type AntenatalDangerSign,
  type PostnatalDangerSign,
  type NeonatalDangerSign,
  type MaternalAssessmentResult,
  type MaternalAssessmentInput,
} from "@/lib/maternal";
import { useI18n } from "@/lib/i18n";
import {
  Baby,
  ChevronRight,
  Heart,
  AlertTriangle,
  Save,
  Ruler,
  Thermometer,
  Weight,
} from "lucide-react";
import { useSessionStore } from "@/stores/sessionStore";
import { useAuditLog } from "@/hooks/useAuditLog";
import { toast } from "sonner";
import { queueAssessment } from "@/lib/sync";
import { getDB } from "@/lib/db";
import type { Assessment, Patient } from "@/types/trij";

export const Route = createFileRoute("/_app/maternal")({
  head: () => ({
    meta: [
      {
        title: "Maternal Health Assessment — Pregnancy & Newborn Triage | Trij",
      },
      {
        name: "description",
        content:
          "Free maternal health assessment tool for CHWs. Antenatal danger signs, postnatal assessment, and neonatal triage. Complete offline.",
      },
      {
        property: "og:title",
        content: "Maternal Health Assessment — Pregnancy & Newborn | Trij",
      },
      {
        name: "keywords",
        content:
          "maternal health, antenatal, postnatal, neonatal, pregnancy assessment, CHW, community health, obstetric emergency",
      },
    ],
  }),
  component: MaternalPage,
});

const ANTENATAL_SIGNS: { value: AntenatalDangerSign; key: string }[] = [
  { value: "heavy_bleeding", key: "antenatalHeavyBleeding" },
  { value: "severe_headache", key: "antenatalSevereHeadache" },
  { value: "blurred_vision", key: "antenatalBlurredVision" },
  { value: "fitting", key: "antenatalFitting" },
  { value: "reduced_fetal_movement", key: "antenatalReducedMovement" },
  { value: "fever", key: "antenatalFever" },
  { value: "difficulty_breathing", key: "antenatalDifficultyBreathing" },
  { value: "severe_abdominal_pain", key: "antenatalSevereAbdominalPain" },
  { value: "water_broken_no_contractions", key: "antenatalWaterBroken" },
  { value: "swollen_face_hands", key: "antenatalSwollenFace" },
];

const POSTNATAL_SIGNS: { value: PostnatalDangerSign; key: string }[] = [
  { value: "heavy_bleeding_postnatal", key: "postnatalHeavyBleeding" },
  { value: "offensive_discharge", key: "postnatalOffensiveDischarge" },
  { value: "fever_postnatal", key: "postnatalFever" },
  { value: "breast_abscess", key: "postnatalBreastAbscess" },
  { value: "breast_engorgement", key: "postnatalBreastEngorgement" },
  { value: "perineal_wound_infection", key: "postnatalPerinealInfection" },
];

const NEONATAL_SIGNS: { value: NeonatalDangerSign; key: string }[] = [
  { value: "neonatal_breathing_difficulty", key: "neonatalBreathing" },
  { value: "neonatal_not_feeding", key: "neonatalNotFeeding" },
  { value: "neonatal_jaundice", key: "neonatalJaundice" },
  { value: "neonatal_hypothermia", key: "neonatalHypothermia" },
  { value: "neonatal_fever", key: "neonatalFever" },
  { value: "neonatal_umbilical_redness", key: "neonatalUmbilicalRedness" },
  { value: "neonatal_umbilical_discharge", key: "neonatalUmbilicalDischarge" },
  { value: "neonatal_convulsions", key: "neonatalConvulsions" },
  { value: "neonatal_vomiting", key: "neonatalVomiting" },
];

function MaternalPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const { log } = useAuditLog();

  const [phase, setPhase] = useState<MaternalPhase | null>(null);
  const [result, setResult] = useState<MaternalAssessmentResult | null>(null);
  const [saved, setSaved] = useState(false);

  const [gestWeeks, setGestWeeks] = useState("");
  const [fundalHeight, setFundalHeight] = useState("");
  const [fetalHR, setFetalHR] = useState("");
  const [parity, setParity] = useState("");
  const [gravidity, setGravidity] = useState("");
  const [antenatalSigns, setAntenatalSigns] = useState<AntenatalDangerSign[]>([]);
  const [postnatalSigns, setPostnatalSigns] = useState<PostnatalDangerSign[]>([]);
  const [neonatalSigns, setNeonatalSigns] = useState<NeonatalDangerSign[]>([]);
  const [temperature, setTemperature] = useState("");
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [neonatalWeight, setNeonatalWeight] = useState("");
  const [neonatalAgeDays, setNeonatalAgeDays] = useState("");

  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientSex, setPatientSex] = useState<"F" | "M" | "other">("F");

  const runAssessment = () => {
    const input: MaternalAssessmentInput = {
      phase: phase!,
      gestationalWeeks: gestWeeks ? Number(gestWeeks) : undefined,
      fundalHeight: fundalHeight ? Number(fundalHeight) : undefined,
      fetalHeartRate: fetalHR ? Number(fetalHR) : undefined,
      parity: parity ? Number(parity) : undefined,
      gravidity: gravidity ? Number(gravidity) : undefined,
      antenatalDangerSigns: antenatalSigns,
      postnatalDangerSigns: postnatalSigns,
      neonatalDangerSigns: neonatalSigns,
      temperature: temperature ? Number(temperature) : undefined,
      systolicBP: systolicBP ? Number(systolicBP) : undefined,
      diastolicBP: diastolicBP ? Number(diastolicBP) : undefined,
      neonatalWeight: neonatalWeight ? Number(neonatalWeight) : undefined,
      neonatalAgeDays: neonatalAgeDays ? Number(neonatalAgeDays) : undefined,
    };
    const r = assessMaternal(input);
    setResult(r);
    log("assessment:create", {
      resourceType: "assessment",
      resourceId: crypto.randomUUID(),
      details: `Maternal assessment: ${r.suspectedCondition} (${r.urgency})`,
    });
  };

  const saveAssessment = async () => {
    if (!user || !result || !patientIdentifier.trim()) return;
    const p: Patient = {
      id: crypto.randomUUID(),
      chwUserId: user.id,
      identifier: patientIdentifier.trim(),
      ageYears: patientAge ? Number(patientAge) : undefined,
      sex: patientSex,
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const db = getDB();
    await db.patients.put(p);
    const a: Assessment = {
      id: crypto.randomUUID(),
      patientId: p.id,
      chwUserId: user.id,
      images: [],
      condition: result.suspectedCondition,
      urgency: result.urgency,
      recommendation: result.recommendation,
      referralStatus: result.referralRequired ? "pending" : "none",
      referralAdvised: result.referralRequired,
      language: "en",
      version: 0,
      createdAt: new Date().toISOString(),
    };
    await queueAssessment(a);
    log("assessment:create", { resourceType: "assessment", resourceId: a.id, patientId: p.id });
    toast.success(t("savedOffline"));
    setSaved(true);
  };

  const toggleSign = <T,>(arr: T[], value: T, setter: (v: T[]) => void) => {
    setter(arr.includes(value) ? arr.filter((s) => s !== value) : [...arr, value]);
  };

  if (saved) {
    return (
      <>
        <AppHeader title={t("maternalHealth")} />
        <div className="mx-auto max-w-lg px-5 py-12 text-center">
          <div className="rounded-3xl border bg-card p-8">
            <Heart className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 font-display text-xl font-bold">{t("assessmentSaved")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("savedOffline")}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={() => navigate({ to: "/patients" })}>{t("viewAll")}</Button>
              <Button variant="outline" onClick={() => navigate({ to: "/triage" })}>
                {t("newTriage")}
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title={t("maternalHealth")} subtitle={t("maternalDesc")} />
      <div className="mx-auto max-w-2xl px-5 py-6">
        {!result ? (
          <div className="space-y-6">
            <div>
              <Label>{t("patientIdentifier")}</Label>
              <Input
                value={patientIdentifier}
                onChange={(e) => setPatientIdentifier(e.target.value)}
                placeholder="e.g. MAT-001"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("ageYears")}</Label>
                <Input
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  type="number"
                  min={10}
                  max={60}
                  placeholder="25"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("sex")}</Label>
                <div className="flex rounded-lg border p-1">
                  {(["F", "M", "other"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setPatientSex(s)}
                      className={`flex-1 rounded-md py-1.5 text-sm font-medium ${patientSex === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold">{t("selectPhase")}</h2>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
                {(["antenatal", "postnatal", "neonatal"] as MaternalPhase[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPhase(p)}
                    className={`rounded-xl border-2 p-4 text-center text-sm font-medium transition-all ${
                      phase === p
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Baby className="mx-auto h-6 w-6" />
                    <span className="mt-1 block">{t(`phase_${p}`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {phase && (phase === "antenatal" || phase === "postnatal") && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("gestationalWeeks")}</Label>
                    <Input
                      value={gestWeeks}
                      onChange={(e) => setGestWeeks(e.target.value)}
                      type="number"
                      min={0}
                      max={44}
                      placeholder="32"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("fundalHeightCm")}</Label>
                    <Input
                      value={fundalHeight}
                      onChange={(e) => setFundalHeight(e.target.value)}
                      type="number"
                      min={0}
                      max={50}
                      placeholder={t("cm")}
                    />
                  </div>
                </div>
                {gestWeeks && (
                  <div className="rounded-xl bg-primary/5 p-3 text-xs text-primary">
                    <Ruler className="mr-1 inline h-3 w-3" />
                    {t("expectedFundalHeight")}: {getFundalHeightGuide(Number(gestWeeks))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("fetalHeartRate")}</Label>
                    <Input
                      value={fetalHR}
                      onChange={(e) => setFetalHR(e.target.value)}
                      type="number"
                      min={60}
                      max={200}
                      placeholder="140"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>{t("gravidity")}</Label>
                      <Input
                        value={gravidity}
                        onChange={(e) => setGravidity(e.target.value)}
                        type="number"
                        min={0}
                        max={20}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("parity")}</Label>
                      <Input
                        value={parity}
                        onChange={(e) => setParity(e.target.value)}
                        type="number"
                        min={0}
                        max={20}
                        placeholder="1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t("systolicBP")}</Label>
                    <Input
                      value={systolicBP}
                      onChange={(e) => setSystolicBP(e.target.value)}
                      type="number"
                      min={60}
                      max={250}
                      placeholder="120"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("diastolicBP")}</Label>
                    <Input
                      value={diastolicBP}
                      onChange={(e) => setDiastolicBP(e.target.value)}
                      type="number"
                      min={30}
                      max={180}
                      placeholder="80"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <Thermometer className="mr-1 inline h-3 w-3" />
                    {t("temperature")}
                  </Label>
                  <Input
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    type="number"
                    min={34}
                    max={43}
                    step={0.1}
                    placeholder="37.0"
                  />
                </div>
              </>
            )}

            {phase === "antenatal" && (
              <div className="rounded-2xl border bg-card p-4">
                <h3 className="text-sm font-semibold">{t("antenatalDangerSigns")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{t("checkAllThatApply")}</p>
                <div className="mt-3 space-y-2">
                  {ANTENATAL_SIGNS.map((item) => (
                    <label key={item.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={antenatalSigns.includes(item.value)}
                        onChange={() => toggleSign(antenatalSigns, item.value, setAntenatalSigns)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {t(item.key as any)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {phase === "postnatal" && (
              <>
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t("postnatalDangerSigns")}</h3>
                  <div className="mt-3 space-y-2">
                    {POSTNATAL_SIGNS.map((item) => (
                      <label key={item.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={postnatalSigns.includes(item.value)}
                          onChange={() => toggleSign(postnatalSigns, item.value, setPostnatalSigns)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {t(item.key as any)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t("neonatalAssessment")}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("neonatalAssessmentDesc")}
                  </p>
                  <div className="mt-3 space-y-2">
                    {NEONATAL_SIGNS.map((item) => (
                      <label key={item.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={neonatalSigns.includes(item.value)}
                          onChange={() => toggleSign(neonatalSigns, item.value, setNeonatalSigns)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {t(item.key as any)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      <Weight className="mr-1 inline h-3 w-3" />
                      {t("neonatalWeight")}
                    </Label>
                    <Input
                      value={neonatalWeight}
                      onChange={(e) => setNeonatalWeight(e.target.value)}
                      type="number"
                      min={0.5}
                      max={6}
                      step={0.1}
                      placeholder="3.2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("neonatalAgeDays")}</Label>
                    <Input
                      value={neonatalAgeDays}
                      onChange={(e) => setNeonatalAgeDays(e.target.value)}
                      type="number"
                      min={0}
                      max={28}
                      placeholder="3"
                    />
                  </div>
                </div>
              </>
            )}

            {phase === "neonatal" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>
                      <Weight className="mr-1 inline h-3 w-3" />
                      {t("neonatalWeight")}
                    </Label>
                    <Input
                      value={neonatalWeight}
                      onChange={(e) => setNeonatalWeight(e.target.value)}
                      type="number"
                      min={0.5}
                      max={6}
                      step={0.1}
                      placeholder="3.2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("neonatalAgeDays")}</Label>
                    <Input
                      value={neonatalAgeDays}
                      onChange={(e) => setNeonatalAgeDays(e.target.value)}
                      type="number"
                      min={0}
                      max={28}
                      placeholder="3"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    <Thermometer className="mr-1 inline h-3 w-3" />
                    {t("temperature")}
                  </Label>
                  <Input
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    type="number"
                    min={34}
                    max={43}
                    step={0.1}
                    placeholder="37.0"
                  />
                </div>
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t("neonatalDangerSigns")}</h3>
                  <div className="mt-3 space-y-2">
                    {NEONATAL_SIGNS.map((item) => (
                      <label key={item.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={neonatalSigns.includes(item.value)}
                          onChange={() => toggleSign(neonatalSigns, item.value, setNeonatalSigns)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {t(item.key as any)}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={runAssessment}
              disabled={!phase || !patientIdentifier.trim()}
              size="lg"
              className="w-full gap-2"
            >
              <Heart className="h-4 w-4" /> {t("assess")} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-3xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <UrgencyPill urgency={result.urgency} />
                <div>
                  <h2 className="font-display text-lg font-bold">{t("assessmentResult" as any)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {t("phase")}: {t(`phase_${result.phase}`)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-card p-6">
              <h3 className="font-display text-sm font-semibold">{t("suspectedCondition")}</h3>
              <p className="mt-1 text-sm">{result.suspectedCondition}</p>
            </div>

            {result.dangerSignsFound.length > 0 && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4" /> {t("dangerSignsFound")}
                </h3>
                <ul className="mt-3 space-y-3">
                  {result.dangerSignsFound.map((sign, i) => (
                    <li key={i} className="text-xs text-red-700">
                      {sign}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-3xl border bg-card p-6">
              <h3 className="font-display text-sm font-semibold">{t("recommendation" as any)}</h3>
              <p className="mt-1 text-sm">{result.recommendation}</p>
            </div>

            {result.referralRequired && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="text-sm font-semibold text-amber-800">{t("referralRequired")}</h3>
                <p className="mt-1 text-xs text-amber-700">{result.referralDetails}</p>
              </div>
            )}

            <Button onClick={saveAssessment} size="lg" className="w-full gap-2">
              <Save className="h-4 w-4" /> {t("saveAssessment")}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setResult(null);
              }}
            >
              {t("startNew")}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
