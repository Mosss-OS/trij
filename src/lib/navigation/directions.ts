/**
 * Turn-by-turn direction generator.
 *
 * Converts a Route (sequence of road segments) into human-readable
 * navigation instructions with distances and bearings.
 */

import type { Route, RouteSegment } from "./pathfinding";
import { haversine } from "./road-graph";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TurnInstruction =
  | "continue"
  | "turn_slight_left"
  | "turn_left"
  | "turn_sharp_left"
  | "turn_slight_right"
  | "turn_right"
  | "turn_sharp_right"
  | "u_turn"
  | "arrive"
  | "depart";

export interface DirectionStep {
  instruction: TurnInstruction;
  roadName?: string;
  distance: number; // metres
  duration: number; // seconds
  bearing: number; // degrees from north
  streetNames: string[];
}

export interface Directions {
  steps: DirectionStep[];
  totalDistance: number;
  totalDuration: number;
  summary: string;
}

/* ------------------------------------------------------------------ */
/*  Bearing calculation                                                */
/* ------------------------------------------------------------------ */

function calcBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const la1 = (lat1 * Math.PI) / 180;
  const la2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/* ------------------------------------------------------------------ */
/*  Classify turn from bearing change                                  */
/* ------------------------------------------------------------------ */

function classifyTurn(bearingChange: number): TurnInstruction {
  const bc = ((bearingChange + 180) % 360) - 180; // normalise to -180..180

  if (Math.abs(bc) < 15) return "continue";
  if (bc >= 15 && bc < 45) return "turn_slight_right";
  if (bc >= 45 && bc < 135) return "turn_right";
  if (bc >= 135) return "turn_sharp_right";
  if (bc <= -15 && bc > -45) return "turn_slight_left";
  if (bc <= -45 && bc > -135) return "turn_left";
  if (bc <= -135) return "turn_sharp_left";
  return "continue";
}

/* ------------------------------------------------------------------ */
/*  Format distance                                                    */
/* ------------------------------------------------------------------ */

function formatDistance(metres: number): string {
  if (metres < 100) return `${Math.round(metres)}m`;
  if (metres < 1000) return `${Math.round(metres / 10) * 10}m`;
  return `${(metres / 1000).toFixed(1)}km`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${m}min`;
}

/* ------------------------------------------------------------------ */
/*  Generate directions from a route                                   */
/* ------------------------------------------------------------------ */

export function generateDirections(route: Route): Directions {
  if (route.segments.length === 0) {
    return {
      steps: [
        {
          instruction: "arrive",
          distance: route.totalDistance,
          duration: 0,
          bearing: 0,
          streetNames: [],
        },
      ],
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      summary: "You have arrived",
    };
  }

  const steps: DirectionStep[] = [];

  // Depart step
  const firstSeg = route.segments[0];
  const departBearing = calcBearing(
    route.startCoords.lat,
    route.startCoords.lng,
    firstSeg.startNode.lat,
    firstSeg.startNode.lng,
  );
  steps.push({
    instruction: "depart",
    roadName: firstSeg.edge.name,
    distance: firstSeg.edge.distance,
    duration: firstSeg.edge.distance / ((firstSeg.edge.maxSpeed ?? 30) / 3.6),
    bearing: departBearing,
    streetNames: firstSeg.edge.name ? [firstSeg.edge.name] : [],
  });

  // Intermediate steps
  let prevBearing = departBearing;
  for (let i = 1; i < route.segments.length; i++) {
    const seg = route.segments[i];
    const prevSeg = route.segments[i - 1];

    const segBearing = calcBearing(
      prevSeg.endNode.lat,
      prevSeg.endNode.lng,
      seg.endNode.lat,
      seg.endNode.lng,
    );

    const bearingChange = segBearing - prevBearing;

    // Only add a step if the road changes or there's a significant turn
    const sameRoad = prevSeg.edge.name && seg.edge.name && prevSeg.edge.name === seg.edge.name;
    const smallTurn = Math.abs(((bearingChange + 180) % 360) - 180) < 15;

    if (sameRoad && smallTurn) {
      // Extend current step distance
      const lastStep = steps[steps.length - 1];
      lastStep.distance += seg.edge.distance;
      lastStep.duration += seg.edge.distance / ((seg.edge.maxSpeed ?? 30) / 3.6);
      lastStep.roadName = seg.edge.name;
      continue;
    }

    const instruction = classifyTurn(bearingChange);
    steps.push({
      instruction,
      roadName: seg.edge.name,
      distance: seg.edge.distance,
      duration: seg.edge.distance / ((seg.edge.maxSpeed ?? 30) / 3.6),
      bearing: segBearing,
      streetNames: seg.edge.name ? [seg.edge.name] : [],
    });

    prevBearing = segBearing;
  }

  // Arrive step
  const lastSeg = route.segments[route.segments.length - 1];
  steps.push({
    instruction: "arrive",
    distance: 0,
    duration: 0,
    bearing: prevBearing,
    streetNames: [],
  });

  // Generate summary
  const roadNames = [...new Set(steps.filter((s) => s.roadName).map((s) => s.roadName))];
  const summary =
    roadNames.length > 0
      ? `via ${roadNames.slice(0, 2).join(" and ")}`
      : `${formatDistance(route.totalDistance)} route`;

  return {
    steps,
    totalDistance: route.totalDistance,
    totalDuration: route.totalDuration,
    summary,
  };
}

/* ------------------------------------------------------------------ */
/*  Human-readable step text                                           */
/* ------------------------------------------------------------------ */

const TURN_LABELS: Record<TurnInstruction, string> = {
  depart: "Head",
  continue: "Continue",
  turn_slight_left: "Bear left",
  turn_left: "Turn left",
  turn_sharp_left: "Sharp left",
  turn_slight_right: "Bear right",
  turn_right: "Turn right",
  turn_sharp_right: "Sharp right",
  u_turn: "Make a U-turn",
  arrive: "Arrive at destination",
};

function bearingToCardinal(bearing: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(bearing / 45) % 8];
}

export function formatStep(step: DirectionStep): string {
  if (step.instruction === "arrive") {
    return TURN_LABELS.arrive;
  }
  if (step.instruction === "depart") {
    const dir = bearingToCardinal(step.bearing);
    const road = step.roadName ? ` onto ${step.roadName}` : "";
    return `Head ${dir}${road} for ${formatDistance(step.distance)}`;
  }
  const road = step.roadName ? ` onto ${step.roadName}` : "";
  return `${TURN_LABELS[step.instruction]}${road} (${formatDistance(step.distance)})`;
}

export function formatStepWithDistance(step: DirectionStep): string {
  return `${formatStep(step)} — ${formatDuration(step.duration)}`;
}

export { formatDistance, formatDuration };
