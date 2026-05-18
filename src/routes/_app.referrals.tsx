import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getDB } from "@/lib/db";
import type { Assessment, Patient } from "@/types/trij";
import { UrgencyPill } from "@/components/UrgencyPill";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Share2, UserRound, RefreshCw, ExternalLink } from "lucide-react";
import { downloadReferralPdf, shareReferralPdf } from "@/lib/referral";
import { updateReferralStatus } from "@/lib/sync";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/referrals")({
  head: () => ({ meta: [{ title: "Referrals — Trij" }] }),
  component: ReferralsPage,
});

const REFERRAL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  active: "In transit",
  resolved: "Resolved",
};

const REFERRAL_STATUS_COLORS: Record<string, string> = {
  pending: "bg-urgency-yellow-bg text-urgency-yellow border-urgency-yellow/30",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-green-50 text-green-700 border-green-200",
};

type TabType = "all" | "pending" | "active" | "resolved";

type ReferralItem = Assessment & { patient?: Patient };

function ReferralsPage() {
  const [items, setItems] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>("all");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const reqSeq = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const db = getDB();
        const all = await db.assessments
          .filter((a) => a.referralAdvised === true)
          .toArray();
        const patients = await Promise.all(
          all.map((a) => db.patients.get(a.patientId)),
        );
        if (!alive) return;
        setItems(
          all.map((a, i) => ({ ...a, patient: patients[i] ?? undefined })),
        );
      } catch {
        /* */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((a) => a.referralStatus === tab);
  }, [items, tab]);

  const handleStatusChange = async (
    assessmentId: string,
    status: "none" | "pending" | "active" | "resolved",
  ) => {
    const seq = (reqSeq.current.get(assessmentId) ?? 0) + 1;
    reqSeq.current.set(assessmentId, seq);
    setSyncingId(assessmentId);
    try {
      await updateReferralStatus(assessmentId, status);
      if (reqSeq.current.get(assessmentId) !== seq) return;
      setItems((prev) =>
        prev.map((a) =>
          a.id === assessmentId
            ? { ...a, referralStatus: status, referralStatusUpdatedAt: new Date().toISOString() }
            : a,
        ),
      );
      toast.success(`Referral marked as ${status}`);
    } catch {
      toast.error("Failed to update referral status");
    } finally {
      if (reqSeq.current.get(assessmentId) === seq) setSyncingId(null);
    }
  };

  const statusCounts = useMemo(() => {
    const counts = { all: items.length, pending: 0, active: 0, resolved: 0 };
    for (const a of items) {
      if (a.referralStatus in counts) counts[a.referralStatus as keyof typeof counts]++;
    }
    return counts;
  }, [items]);

  const tabs: { key: TabType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "active", label: "In transit" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <>
      <AppHeader title="Referrals" />
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="mb-5 flex gap-1 rounded-xl bg-muted p-1">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {statusCounts[key] > 0 && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {statusCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid h-48 place-items-center">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {tab === "all" ? "No referrals yet." : `No ${tab} referrals.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to="/patients/$patientId"
                        params={{ patientId: a.patientId }}
                        className="flex items-center gap-1.5 font-medium hover:text-primary"
                      >
                        {a.patient?.identifier ?? "Unknown"}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </Link>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {a.condition ?? "Assessment"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.urgency && <UrgencyPill urgency={a.urgency} />}
                    {REFERRAL_STATUS_LABELS[a.referralStatus] && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${REFERRAL_STATUS_COLORS[a.referralStatus] || ""}`}
                      >
                        {REFERRAL_STATUS_LABELS[a.referralStatus]}
                      </span>
                    )}
                  </div>
                </div>

                {a.recommendation && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {a.recommendation}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Select
                    value={a.referralStatus}
                    onValueChange={(v) =>
                      handleStatusChange(
                        a.id,
                        v as "none" | "pending" | "active" | "resolved",
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">In transit</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  {syncingId === a.id && (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      if (a.patient) downloadReferralPdf(a.patient, a);
                    }}
                  >
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => {
                      if (a.patient) shareReferralPdf(a.patient, a);
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
