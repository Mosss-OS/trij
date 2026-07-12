/**
 * Navigation module — offline turn-by-turn directions to health facilities.
 *
 * Usage:
 *   import { useNavigation } from "@/hooks/useNavigation";
 *   const { navigateTo, stop, status, steps } = useNavigation();
 *
 *   // Navigate to a facility
 *   await navigateTo({ lat: 6.5244, lng: 3.3792 }, "Lagos University Teaching Hospital");
 *
 *   // Stop navigation
 *   stop();
 */

// Core engine
export { getRoute, precacheGraphs, type RoutingResult, type EngineKind } from "./routing-engine";
export { aStar, type Route, type RouteSegment } from "./pathfinding";
export { generateDirections, formatStep, formatStepWithDistance, formatDistance, formatDuration, type Directions, type DirectionStep, type TurnInstruction } from "./directions";

// Road graph
export { haversine, findNearestNode, REGIONS, buildAdjacency, loadGraphFromNetwork, findRegionForCoords, type RoadGraph, type RoadNode, type RoadEdge, type RoadClass, type RegionInfo } from "./road-graph";

// Storage
export { storeRoadGraph, getStoredRoadGraph, listStoredGraphs, deleteStoredGraph } from "./road-graph-store";

// Navigation manager
export { NavigationManager, getNavigationManager, type NavigationStatus, type NavigationState, type NavigationCallbacks } from "./offline-nav";
