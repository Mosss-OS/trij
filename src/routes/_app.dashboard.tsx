import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/stores/sessionStore";
import { useReferralAlerts } from "@/hooks/useReferralAlerts";
import { getDB } from "@/lib/db";
import type { Assessment, Patient, FollowUp } from "@/types/trij";
import { useAuditLog } from "@/hooks/useAuditLog";
import { UrgencyPill } from "@/components/UrgencyPill";
import {
  Camera,
  FileText,
  Stethoscope,
  Calendar,
  Map as MapIcon,
  ArrowRight,
  HardDrive,
  ExternalLink,
  BellRing,
  Clock,
  Calculator,
} from "lucide-react";
import { StorageMonitor } from "@/components/StorageMonitor";
import { formatDistanceToNow, isPast, isToday, format } from "date-fns";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trij Free Offline AI Medical Triage" },
      {
        name: "description",
        content:
          "Community health worker dashboard for Trij, the free offline AI medical triage app. Start a new wound or rash assessment, view recent patients, and manage referrals.",
      },
      {
        name: "keywords",
        content:
          "CHW dashboard, medical triage dashboard, community health worker tools, patient assessment overview",
      },
      { property: "og:title", content: "Dashboard — Trij Medical Triage" },
      {
        property: "og:description",
        content:
          "Manage patient assessments, triage results, and referrals from your CHW dashboard.",
      },
      { name: "twitter:title", content: "Dashboard — Trij Medical Triage" },
      {
        name: "twitter:description",
        content:
          "Manage patient assessments, triage results, and referrals from your CHW dashboard.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t, language } = useI18n();
  const user = useSessionStore((s) => s.user);
  const { log } = useAuditLog();
  const name = (user?.user_metadata?.name as string) || user?.email?.split("@")[0] || "CHW";
  const [recent, setRecent] = useState<(Assessment & { patient?: Patient })[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);
  const { unseen, count: alertCount, markAllAsSeen } = useReferralAlerts();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = getDB();
        const a = await db.assessments.orderBy("createdAt").reverse().limit(5).toArray();
        const patients = await Promise.all(a.map((x) => db.patients.get(x.patientId)));
        /* Load upcoming pending follow-ups (today and future) */
        const now = new Date().toISOString();
        const allFu = await db.followUps
          .where("status")
          .equals("pending")
          .toArray();
        const upcoming = allFu
          .filter((f) => f.scheduledFor >= now.slice(0, 10))
          .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))
          .slice(0, 5);
        if (!alive) return;
        setRecent(a.map((x, i) => ({ ...x, patient: patients[i] })));
        setUpcomingFollowUps(upcoming);
        log("assessment:list", { resourceType: "assessment", details: `Dashboard: ${a.length} recent assessments` });
        if (upcoming.length > 0) {
          log("followup:read", { resourceType: "followup", details: `Dashboard: ${upcoming.length} upcoming follow-ups` });
        }
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
      <div className="mx-auto max-w-4xl px-5 pb-10">
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
                    {t("triageDesc")}
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

        {alertCount > 0 && (
          <section className="mt-5">
            <Link
              to={"/referrals" as never}
              className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 transition-colors hover:bg-blue-100"
            >
              <BellRing className="h-5 w-5 flex-shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-blue-800">
                  {alertCount} unacknowledged referral{alertCount > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-blue-600/70">Tap to view in Referrals</p>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsSeen();
                }}
                className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
              >
                Dismiss
              </button>
            </Link>
          </section>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickTile to="/document" icon={FileText} label={t("scanDoc")} />
          <QuickTile to="/patients" icon={Stethoscope} label={t("patients")} />
          <QuickTile to="/referrals" icon={ExternalLink} label={t("referrals")} />
          <QuickTile to="/calculator" icon={Calculator} label={t("doseCalculator")} />
          <QuickTile to="/supervisor" icon={MapIcon} label={t("map")} />
        </section>

        {upcomingFollowUps.length > 0 && (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">{t("upcomingFollowUps")}</h2>
              <Link to="/patients" className="text-xs font-medium text-primary">
                {t("viewAll")}
              </Link>
            </div>
            <div className="space-y-2">
              {upcomingFollowUps.map((f) => {
                const dueDate = new Date(f.scheduledFor);
                const past = isPast(dueDate);
                const today = isToday(dueDate);
                return (
                  <Link
                    key={f.id}
                    to="/patients/$patientId"
                    params={{ patientId: f.patientId }}
                    className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors hover:bg-accent/30 ${
                      past ? "border-red-200 bg-red-50" : today ? "border-amber-200 bg-amber-50" : "bg-card"
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Calendar className={`h-4 w-4 ${past ? "text-red-500" : "text-primary"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t("followUp")}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(dueDate, "MMM d, HH:mm")}
                        {past && ` · ${t("overdue")}`}
                        {today && ` · ${t("dueToday")}`}
                      </p>
                      {f.notes && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.notes}</p>
                      )}
                    </div>
                    <Clock className={`h-4 w-4 shrink-0 ${past ? "text-red-500" : "text-muted-foreground"}`} />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

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
                          {a.patient?.identifier ?? t("unknownPatient")}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {a.condition ?? t("pending_status")} ·{" "}
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
