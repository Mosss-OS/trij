import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/sessionStore";
import { getDB } from "@/lib/db";
import type { Assessment, Patient } from "@/types/trij";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Camera, FileText, Stethoscope, Map as MapIcon, ArrowRight, HardDrive } from "lucide-react";
import { StorageMonitor } from "@/components/StorageMonitor";
import { formatDistanceToNow } from "date-fns";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Trij" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t, language } = useI18n();
  const user = useSessionStore((s) => s.user);
  const name = (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "CHW";
  const [recent, setRecent] = useState<(Assessment & { patient?: Patient })[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = getDB();
        const a = await db.assessments.orderBy("createdAt").reverse().limit(5).toArray();
        const patients = await Promise.all(a.map((x) => db.patients.get(x.patientId)));
        if (!alive) return;
        setRecent(a.map((x, i) => ({ ...x, patient: patients[i] })));
      } catch {
        /* db not ready */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("goodMorning");
    if (h < 18) return t("goodAfternoon");
    return t("goodEvening");
  })();

  return (
    <>
      <AppHeader title={t("trij")} subtitle={t("onDeviceTriage")} />
      <div className="mx-auto max-w-2xl px-5 pb-10">
        <section className="pt-6">
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight">{name}.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date().toLocaleDateString(language, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </section>

        <section className="mt-7">
          <Link to="/triage" className="group block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-glow p-6 text-primary-foreground shadow-lg shadow-primary/20">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80">
                    {t("quickAction")}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold">{t("newTriage")}</h2>
                  <p className="mt-2 text-sm opacity-85">
                    Capture a wound or skin condition photo for instant assessment.
                  </p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                  <Camera className="h-6 w-6" />
                </div>
              </div>
              <div className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-medium">
                {t("start")}{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <QuickTile to="/document" icon={FileText} label={t("scanDoc")} />
          <QuickTile to="/patients" icon={Stethoscope} label={t("patients")} />
          <QuickTile to="/supervisor" icon={MapIcon} label={t("map")} />
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2 rounded-2xl border bg-card p-4">
            <HardDrive className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <StorageMonitor />
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t("recentTriage")}</h2>
            <Link to="/patients" className="text-xs font-medium text-primary">
              {t("viewAll")}
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/50 p-8 text-center">
              <p className="text-sm text-muted-foreground">{t("noAssessments")}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: a.patientId }}
                    className="block rounded-2xl border bg-card p-4 transition-colors hover:bg-accent/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {a.patient?.identifier ?? "Unknown patient"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {a.condition ?? "Pending"} ·{" "}
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {a.urgency && <UrgencyPill urgency={a.urgency} />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function QuickTile({ to, icon: Icon, label }: { to: string; icon: typeof Camera; label: string }) {
  return (
    <Link
      to={to as never}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border bg-card p-4 text-center transition-colors hover:bg-accent/30"
    >
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
