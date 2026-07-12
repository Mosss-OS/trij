/**
 * useNavigation — React hook for offline navigation.
 */

import { useCallback, useEffect } from "react";
import { useNavigationStore } from "@/stores/navigationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { getCurrentPosition, type GeoCoords } from "@/lib/geolocation";
import { precacheGraphs } from "@/lib/navigation/routing-engine";
import { getNavigationManager } from "@/lib/navigation/offline-nav";
import type { EngineKind } from "@/lib/navigation/routing-engine";

export function useNavigation() {
  const store = useNavigationStore();
  const batterySaver = useSettingsStore((s) => s.batterySaver);
  const autoReroute = useSettingsStore((s) => s.autoReroute);

  // Pre-cache road graphs on mount
  useEffect(() => {
    precacheGraphs().catch(() => {});
  }, []);

  // Apply battery saver setting
  useEffect(() => {
    getNavigationManager().setBatterySaver(batterySaver);
  }, [batterySaver]);

  // Apply auto-reroute setting
  useEffect(() => {
    getNavigationManager().setAutoReroute(autoReroute);
  }, [autoReroute]);

  const navigateTo = useCallback(
    async (
      destination: GeoCoords,
      destinationName?: string,
      preferredEngine?: EngineKind,
    ) => {
      const origin = await getCurrentPosition(10_000);
      if (!origin) {
        useNavigationStore.setState({
          error: "Could not determine your location. Please ensure GPS is enabled.",
          status: "error",
        });
        return false;
      }
      return store.startNavigation(origin, destination, destinationName, preferredEngine);
    },
    [store.startNavigation],
  );

  const stop = useCallback(() => {
    store.stopNavigation();
  }, [store.stopNavigation]);

  return {
    ...store,
    navigateTo,
    stop,
  };
}
