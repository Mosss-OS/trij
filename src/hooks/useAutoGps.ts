import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStore } from "@/stores/sessionStore";
import { getCurrentPosition } from "@/lib/geolocation";

const GPS_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAutoGps() {
  const session = useSessionStore((s) => s.session);
  const offlineUser = useSessionStore((s) => s.offlineUser);
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    if (!session?.user || offlineUser) return;

    const userId = session.user.id;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const saveGps = async () => {
      if (cancelled) return;
      const now = Date.now();
      if (now - lastUpdateRef.current < GPS_UPDATE_INTERVAL) return;

      try {
        const coords = await getCurrentPosition(8000);
        if (!coords || cancelled) return;

        lastUpdateRef.current = now;
        await supabase
          .from("chw_profiles")
          .update({
            location_lat: coords.lat,
            location_lng: coords.lng,
            last_sync: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } catch {
        // GPS unavailable or update failed — silent fail
      }
    };

    // Save immediately on mount (if online)
    saveGps();

    // Then every 5 minutes
    intervalId = setInterval(saveGps, GPS_UPDATE_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [session?.user?.id, offlineUser]);
}
