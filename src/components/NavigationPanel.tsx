/**
 * NavigationPanel — turn-by-turn directions overlay.
 *
 * Shows current instruction, distance to next turn, remaining
 * distance, and ETA.  Designed for use on low-end Android phones
 * in bright sunlight (high contrast, large touch targets).
 */

import { useNavigation } from "@/hooks/useNavigation";
import { formatDistance, formatDuration } from "@/lib/navigation/directions";
import { Navigation, X, MapPin, Clock, Route, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const BEARING_ARROWS: Record<number, string> = {
  0: "↑",
  45: "↗",
  90: "→",
  135: "↘",
  180: "↓",
  225: "↙",
  270: "←",
  315: "↖",
};

function bearingArrow(bearing: number): string {
  const keys = Object.keys(BEARING_ARROWS).map(Number);
  let closest = keys[0];
  let minDiff = 360;
  for (const k of keys) {
    const diff = Math.abs(((bearing - k + 180) % 360) - 180);
    if (diff < minDiff) {
      minDiff = diff;
      closest = k;
    }
  }
  return BEARING_ARROWS[closest];
}

export function NavigationPanel() {
  const {
    status,
    steps,
    currentStepIndex,
    distanceToNextTurn,
    distanceToDestination,
    totalDistance,
    totalDuration,
    summary,
    destinationName,
    engine,
    error,
    isNavigating,
    stop,
  } = useNavigation();

  if (!isNavigating && status === "idle") return null;

  if (status === "error") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-destructive">Navigation Error</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          <button
            onClick={stop}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (status === "calculating") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Calculating route{destinationName ? ` to ${destinationName}` : ""}...</p>
        </div>
      </div>
    );
  }

  if (status === "arrived") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-green-500 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              You have arrived!
            </p>
            {destinationName && (
              <p className="text-xs text-muted-foreground mt-0.5">{destinationName}</p>
            )}
          </div>
          <button
            onClick={stop}
            className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];
  const remainingSteps = steps.length - currentStepIndex - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
      {/* Main instruction */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Turn arrow */}
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-primary">
              {currentStep ? bearingArrow(currentStep.bearing) : "·"}
            </span>
          </div>

          {/* Instruction text */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">
              {currentStep?.roadName
                ? `Continue on ${currentStep.roadName}`
                : status === "off_route"
                  ? "Recalculating..."
                  : "Continue"}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatDistance(distanceToNextTurn)} to next turn
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={stop}
            className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
            aria-label="Stop navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-border px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Route className="h-3.5 w-3.5" />
          <span>{formatDistance(distanceToDestination)} remaining</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDuration(totalDuration)} total</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Navigation className="h-3.5 w-3.5" />
          <span>{remainingSteps} turns left</span>
        </div>
        {engine && (
          <span className="text-[10px] text-muted-foreground/60 uppercase">
            {engine}
          </span>
        )}
      </div>

      {/* Off-route indicator */}
      {status === "off_route" && (
        <div className="bg-yellow-500/10 border-t border-yellow-500/20 px-4 py-2 text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Off route — recalculating...</span>
        </div>
      )}

      {/* Next steps preview (when more than 1 step remaining) */}
      {remainingSteps > 1 && (
        <div className="border-t border-border px-4 py-2 bg-muted/20">
          <p className="text-[10px] uppercase text-muted-foreground/60 mb-1">Next</p>
          <p className="text-xs text-muted-foreground truncate">
            Then: {steps[currentStepIndex + 1]?.roadName
              ? `${steps[currentStepIndex + 1].roadName}`
              : steps[currentStepIndex + 1]?.instruction?.replace("_", " ")}
          </p>
        </div>
      )}
    </div>
  );
}
