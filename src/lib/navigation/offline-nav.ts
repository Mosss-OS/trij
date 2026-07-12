/**
 * Offline Navigation Manager.
 *
 * Handles live GPS tracking, rerouting, and navigation state while
 * the user is actively navigating to a facility.  All logic runs
 * on-device with no internet requirement.
 */

import type { GeoCoords } from "@/lib/geolocation";
import { haversine } from "./road-graph";
import { getRoute, type RoutingResult, type EngineKind } from "./routing-engine";
import { generateDirections, type Directions, type DirectionStep } from "./directions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NavigationStatus =
  | "idle"
  | "calculating"
  | "navigating"
  | "off_route"
  | "arrived"
  | "error";

export interface NavigationState {
  status: NavigationStatus;
  currentStepIndex: number;
  steps: DirectionStep[];
  totalDistance: number;
  totalDuration: number;
  summary: string;
  distanceToNextTurn: number;
  distanceToDestination: number;
  currentBearing: number;
  offRouteDistance: number;
  engine: EngineKind | null;
  error: string | null;
  routeSegments: import("./pathfinding").RouteSegment[];
}

export interface NavigationCallbacks {
  onStatusChange?: (status: NavigationStatus) => void;
  onStepChange?: (stepIndex: number, step: DirectionStep) => void;
  onPositionUpdate?: (position: GeoCoords, distanceToDest: number) => void;
  onArrival?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const REROUTE_THRESHOLD = 50; // metres off-route before recalculating
const ARRIVAL_THRESHOLD = 20; // metres from destination to consider arrived
const POSITION_UPDATE_INTERVAL = 3000; // ms between GPS polls
const BEARING_WINDOW = 5; // positions to average for bearing calculation
const BATTERY_SAVER_INTERVAL = 10000; // ms between GPS polls in battery saver mode
const STATIONARY_THRESHOLD = 5; // metres movement to consider stationary

/* ------------------------------------------------------------------ */
/*  NavigationManager class                                            */
/* ------------------------------------------------------------------ */

export class NavigationManager {
  private state: NavigationState = {
    status: "idle",
    currentStepIndex: 0,
    steps: [],
    totalDistance: 0,
    totalDuration: 0,
    summary: "",
    distanceToNextTurn: 0,
    distanceToDestination: 0,
    currentBearing: 0,
    offRouteDistance: 0,
    engine: null,
    error: null,
    routeSegments: [],
  };

  private watchId: number | null = null;
  private callbacks: NavigationCallbacks = {};
  private goal: GeoCoords | null = null;
  private routeResult: RoutingResult | null = null;
  private positionHistory: GeoCoords[] = [];
  private lastReroutePos: GeoCoords | null = null;
  private batterySaver = false;
  private autoReroute = true;
  private lastPosition: GeoCoords | null = null;
  private stationaryCount = 0;

  getState(): Readonly<NavigationState> {
    return { ...this.state };
  }

  /* -------------------------------------------------------------- */
  /*  Start navigation                                               */
  /* -------------------------------------------------------------- */

  async start(
    origin: GeoCoords,
    destination: GeoCoords,
    callbacks: NavigationCallbacks = {},
    preferredEngine: EngineKind = "custom-astar",
  ): Promise<boolean> {
    this.callbacks = callbacks;
    this.goal = destination;
    this.positionHistory = [];
    this.lastReroutePos = null;

    this.updateState({ status: "calculating", error: null });

    const result = await getRoute(origin, destination, preferredEngine);
    if (!result) {
      this.updateState({
        status: "error",
        error: "Could not calculate route. Road data may not be available for this area.",
      });
      return false;
    }

    this.routeResult = result;
    const { directions } = result;

    this.updateState({
      status: "navigating",
      steps: directions.steps,
      totalDistance: directions.totalDistance,
      totalDuration: directions.totalDuration,
      summary: directions.summary,
      currentStepIndex: 0,
      distanceToNextTurn: directions.steps[0]?.distance ?? 0,
      distanceToDestination: directions.totalDistance,
      engine: result.engine,
      routeSegments: result.route.segments,
    });

    this.callbacks.onStepChange?.(0, this.state.steps[0]);
    this.startGpsTracking();

    return true;
  }

  /* -------------------------------------------------------------- */
  /*  Stop navigation                                                */
  /* -------------------------------------------------------------- */

  stop(): void {
    this.stopGpsTracking();
    this.updateState({ status: "idle", routeSegments: [] });
    this.goal = null;
    this.routeResult = null;
    this.positionHistory = [];
  }

  /* -------------------------------------------------------------- */
  /*  Battery saver                                                   */
  /* -------------------------------------------------------------- */

  setBatterySaver(enabled: boolean): void {
    this.batterySaver = enabled;
    // Restart GPS tracking with new settings if currently navigating
    if (this.state.status === "navigating" || this.state.status === "off_route") {
      this.stopGpsTracking();
      this.startGpsTracking();
    }
  }

  setAutoReroute(enabled: boolean): void {
    this.autoReroute = enabled;
  }

  /* -------------------------------------------------------------- */
  /*  GPS tracking                                                   */
  /* -------------------------------------------------------------- */

  private startGpsTracking(): void {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      this.updateState({ status: "error", error: "GPS not available on this device" });
      return;
    }

    const highAccuracy = !this.batterySaver;
    const maxAge = this.batterySaver ? BATTERY_SAVER_INTERVAL : POSITION_UPDATE_INTERVAL;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: GeoCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        this.handlePositionUpdate(coords);
      },
      () => {
        // GPS error — continue with last known position
      },
      {
        enableHighAccuracy: highAccuracy,
        timeout: 10_000,
        maximumAge: maxAge,
      },
    );
  }

  private stopGpsTracking(): void {
    if (this.watchId !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /* -------------------------------------------------------------- */
  /*  Position update handler                                        */
  /* -------------------------------------------------------------- */

  private handlePositionUpdate(position: GeoCoords): void {
    if (this.state.status !== "navigating" && this.state.status !== "off_route") return;
    if (!this.goal) return;

    // Battery saver: detect stationary and reduce updates
    if (this.batterySaver && this.lastPosition) {
      const moved = haversine(
        this.lastPosition.lat,
        this.lastPosition.lng,
        position.lat,
        position.lng,
      );
      if (moved < STATIONARY_THRESHOLD) {
        this.stationaryCount++;
        // If stationary for 3+ updates, skip this update
        if (this.stationaryCount >= 3) return;
      } else {
        this.stationaryCount = 0;
      }
    }
    this.lastPosition = position;

    // Track position history for bearing calculation
    this.positionHistory.push(position);
    if (this.positionHistory.length > BEARING_WINDOW) {
      this.positionHistory.shift();
    }

    // Calculate bearing
    const bearing = this.calculateBearing();

    // Distance to destination
    const distToDest = haversine(position.lat, position.lng, this.goal.lat, this.goal.lng);

    // Check arrival
    if (distToDest < ARRIVAL_THRESHOLD) {
      this.stopGpsTracking();
      this.updateState({
        status: "arrived",
        distanceToDestination: distToDest,
        currentBearing: bearing,
      });
      this.callbacks.onArrival?.();
      this.callbacks.onStatusChange?.("arrived");
      return;
    }

    // Check if off-route
    if (this.autoReroute && this.lastReroutePos) {
      const distFromLastReroute = haversine(
        position.lat,
        position.lng,
        this.lastReroutePos.lat,
        this.lastReroutePos.lng,
      );
      if (distFromLastReroute > REROUTE_THRESHOLD && this.state.status === "navigating") {
        this.reroute(position);
        return;
      }
    }

    // Update current step
    this.updateCurrentStep(position, distToDest, bearing);

    this.callbacks.onPositionUpdate?.(position, distToDest);
  }

  /* -------------------------------------------------------------- */
  /*  Step tracking                                                  */
  /* -------------------------------------------------------------- */

  private updateCurrentStep(
    position: GeoCoords,
    distToDest: number,
    bearing: number,
  ): void {
    const steps = this.state.steps;
    let stepIdx = this.state.currentStepIndex;

    // Simple step advancement: if we're close to the next step's end, advance
    // In a full implementation, this would check if we've passed the turn point
    if (stepIdx < steps.length - 2) {
      const nextStep = steps[stepIdx + 1];
      // If remaining distance on current step is small, advance
      if (this.state.distanceToNextTurn < 30) {
        stepIdx++;
        this.callbacks.onStepChange?.(stepIdx, steps[stepIdx]);
      }
    }

    // Estimate distance to next turn (simplified)
    const remainingOnStep = Math.max(0, this.state.distanceToNextTurn - 20); // rough estimate

    this.updateState({
      currentStepIndex: stepIdx,
      distanceToDestination: distToDest,
      distanceToNextTurn: remainingOnStep > 0 ? remainingOnStep : steps[stepIdx]?.distance ?? 0,
      currentBearing: bearing,
    });
  }

  /* -------------------------------------------------------------- */
  /*  Rerouting                                                      */
  /* -------------------------------------------------------------- */

  private async reroute(position: GeoCoords): Promise<void> {
    if (!this.goal) return;

    this.updateState({ status: "off_route" });
    this.lastReroutePos = position;

    const result = await getRoute(position, this.goal, this.state.engine ?? "custom-astar");
    if (!result) {
      this.updateState({
        status: "error",
        error: "Could not recalculate route. Trying to rejoin original route.",
      });
      return;
    }

    this.routeResult = result;
    this.updateState({
      status: "navigating",
      steps: result.directions.steps,
      totalDistance: result.directions.totalDistance,
      totalDuration: result.directions.totalDuration,
      summary: result.directions.summary,
      currentStepIndex: 0,
      distanceToNextTurn: result.directions.steps[0]?.distance ?? 0,
      distanceToDestination: result.directions.totalDistance,
      engine: result.engine,
      routeSegments: result.route.segments,
    });

    this.callbacks.onStepChange?.(0, this.state.steps[0]);
  }

  /* -------------------------------------------------------------- */
  /*  Bearing calculation                                            */
  /* -------------------------------------------------------------- */

  private calculateBearing(): number {
    const positions = this.positionHistory;
    if (positions.length < 2) return 0;

    const last = positions[positions.length - 1];
    const prev = positions[positions.length - 2];

    const dLng = ((last.lng - prev.lng) * Math.PI) / 180;
    const la1 = (prev.lat * Math.PI) / 180;
    const la2 = (last.lat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(la2);
    const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  /* -------------------------------------------------------------- */
  /*  State management                                               */
  /* -------------------------------------------------------------- */

  private updateState(partial: Partial<NavigationState>): void {
    this.state = { ...this.state, ...partial };
    this.callbacks.onStatusChange?.(this.state.status);
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton                                                          */
/* ------------------------------------------------------------------ */

let _instance: NavigationManager | null = null;

export function getNavigationManager(): NavigationManager {
  if (!_instance) _instance = new NavigationManager();
  return _instance;
}
