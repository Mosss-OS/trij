/**
 * Navigation Store — Zustand state for offline navigation.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { GeoCoords } from "@/lib/geolocation";
import type { EngineKind } from "@/lib/navigation/routing-engine";
import type { NavigationStatus } from "@/lib/navigation/offline-nav";
import type { DirectionStep } from "@/lib/navigation/directions";
import type { RouteSegment } from "@/lib/navigation/pathfinding";
import {
  getNavigationManager,
  type NavigationCallbacks,
} from "@/lib/navigation/offline-nav";

interface NavigationStoreState {
  status: NavigationStatus;
  currentStepIndex: number;
  steps: DirectionStep[];
  totalDistance: number;
  totalDuration: number;
  summary: string;
  distanceToNextTurn: number;
  distanceToDestination: number;
  currentBearing: number;
  engine: EngineKind | null;
  error: string | null;
  destinationName: string | null;
  destinationCoords: GeoCoords | null;
  isNavigating: boolean;
  routeSegments: RouteSegment[];

  startNavigation: (
    origin: GeoCoords,
    destination: GeoCoords,
    destinationName?: string,
    preferredEngine?: EngineKind,
  ) => Promise<boolean>;
  stopNavigation: () => void;
  syncFromManager: () => void;
}

export const useNavigationStore = create<NavigationStoreState>()(
  persist(
    (set, get) => ({
      status: "idle",
      currentStepIndex: 0,
      steps: [],
      totalDistance: 0,
      totalDuration: 0,
      summary: "",
      distanceToNextTurn: 0,
      distanceToDestination: 0,
      currentBearing: 0,
      engine: null,
      error: null,
      destinationName: null,
      destinationCoords: null,
      isNavigating: false,
      routeSegments: [],

      startNavigation: async (
        origin: GeoCoords,
        destination: GeoCoords,
        destinationName?: string,
        preferredEngine: EngineKind = "custom-astar",
      ) => {
        const mgr = getNavigationManager();

        const callbacks: NavigationCallbacks = {
          onStatusChange: () => get().syncFromManager(),
          onStepChange: () => get().syncFromManager(),
          onPositionUpdate: () => get().syncFromManager(),
          onArrival: () => get().syncFromManager(),
        };

        const success = await mgr.start(origin, destination, callbacks, preferredEngine, destinationName);

        if (success) {
          const state = mgr.getState();
          set({
            status: state.status,
            currentStepIndex: state.currentStepIndex,
            steps: state.steps,
            totalDistance: state.totalDistance,
            totalDuration: state.totalDuration,
            summary: state.summary,
            distanceToNextTurn: state.distanceToNextTurn,
            distanceToDestination: state.distanceToDestination,
            currentBearing: state.currentBearing,
            engine: state.engine,
            error: state.error,
            destinationName: destinationName ?? null,
            destinationCoords: destination,
            isNavigating: true,
            routeSegments: state.routeSegments,
          });
        } else {
          const state = mgr.getState();
          set({
            status: state.status,
            error: state.error,
            isNavigating: false,
          });
        }

        return success;
      },

      stopNavigation: () => {
        getNavigationManager().stop();
        set({
          status: "idle",
          currentStepIndex: 0,
          steps: [],
          totalDistance: 0,
          totalDuration: 0,
          summary: "",
          distanceToNextTurn: 0,
          distanceToDestination: 0,
          currentBearing: 0,
          engine: null,
          error: null,
          destinationName: null,
          destinationCoords: null,
          isNavigating: false,
          routeSegments: [],
        });
      },

      syncFromManager: () => {
        const state = getNavigationManager().getState();
        set({
          status: state.status,
          currentStepIndex: state.currentStepIndex,
          steps: state.steps,
          totalDistance: state.totalDistance,
          totalDuration: state.totalDuration,
          summary: state.summary,
          distanceToNextTurn: state.distanceToNextTurn,
          distanceToDestination: state.distanceToDestination,
          currentBearing: state.currentBearing,
          engine: state.engine,
          error: state.error,
          isNavigating: state.status === "navigating" || state.status === "off_route",
          routeSegments: state.routeSegments,
        });
      },
    }),
    {
      name: "trij-navigation",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      ),
      partialize: (state) => ({
        // Only persist minimal state for session recovery
        isNavigating: state.isNavigating,
        destinationName: state.destinationName,
        destinationCoords: state.destinationCoords,
      }),
    },
  ),
);
