import { useState, useEffect, useCallback, useRef } from "react";
import { getDB } from "@/lib/db";
import type { InAppNotification, NotificationKind } from "@/types/trij";

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const cleanedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const db = getDB();
      const all = await db.notifications
        .orderBy("createdAt")
        .reverse()
        .limit(100)
        .toArray();

      if (!cleanedRef.current) {
        const cutoff = Date.now() - DAYS_30_MS;
        const old = all.filter((n) => new Date(n.createdAt).getTime() < cutoff);
        if (old.length > 0) {
          await db.notifications.bulkDelete(old.map((n) => n.id));
        }
        cleanedRef.current = true;
      }

      const fresh = all.filter((n) => new Date(n.createdAt).getTime() > Date.now() - DAYS_30_MS);
      setNotifications(fresh);
      setUnreadCount(fresh.filter((n) => !n.read).length);
    } catch {
      /* IndexedDB may not be available */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const addNotification = useCallback(
    async (n: Omit<InAppNotification, "id" | "read" | "createdAt">) => {
      const notification: InAppNotification = {
        ...n,
        id: crypto.randomUUID(),
        read: false,
        createdAt: new Date().toISOString(),
      };
      try {
        await getDB().notifications.add(notification);
        await load();
      } catch {}
    },
    [load],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await getDB().notifications.update(id, { read: true });
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const db = getDB();
      const unread = await db.notifications.where("read").equals(0).toArray();
      await Promise.all(unread.map((n) => db.notifications.update(n.id, { read: true })));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  }, []);

  const generateReferralNotification = useCallback(
    async (assessmentId: string, patientName: string, urgency: string) => {
      await addNotification({
        kind: "referral_status",
        title: "Referral status updated",
        body: `${patientName} — ${urgency} urgency referral`,
        linkTo: `/patients/${assessmentId}`,
      });
    },
    [addNotification],
  );

  const generateFollowUpReminder = useCallback(
    async (patientId: string, patientName: string) => {
      await addNotification({
        kind: "follow_up_reminder",
        title: "Follow-up reminder",
        body: `${patientName} has a scheduled follow-up today`,
        linkTo: `/patients/${patientId}`,
      });
    },
    [addNotification],
  );

  const generateSyncComplete = useCallback(
    async (count: number) => {
      await addNotification({
        kind: "sync_complete",
        title: "Sync complete",
        body: `${count} item${count !== 1 ? "s" : ""} synced successfully`,
      });
    },
    [addNotification],
  );

  return {
    notifications,
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    generateReferralNotification,
    generateFollowUpReminder,
    generateSyncComplete,
    refresh: load,
  };
}
