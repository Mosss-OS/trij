/**
 * FacilityDirections — "Get Directions" button + route overlay for facilities.
 *
 * Integrates with the existing facilities system to add offline
 * turn-by-turn navigation to the nearest hospital/clinic.
 */

import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Navigation, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigation } from "@/hooks/useNavigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getCurrentPosition, type GeoCoords } from "@/lib/geolocation";
import { findNearestFacility, getFacilities, type Facility } from "@/lib/facilities";
import { haversine } from "@/lib/navigation/road-graph";
import { cn } from "@/lib/utils";

interface FacilityDirectionsProps {
  assessmentUrgency?: "green" | "yellow" | "red";
  patientCoords?: GeoCoords;
  onFacilitySelected?: (facility: Facility, distance: number) => void;
}

export function FacilityDirections({
  assessmentUrgency,
  patientCoords,
  onFacilitySelected,
}: FacilityDirectionsProps) {
  const [userCoords, setUserCoords] = useState<GeoCoords | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const isOnline = useOnlineStatus();
  const { navigateTo, isNavigating, status, stop } = useNavigation();

  // Get user location on mount
  useEffect(() => {
    getCurrentPosition(10_000).then((coords) => {
      if (coords) {
        setUserCoords(coords);
        const nearest = findNearestFacility(coords);
        if (nearest) {
          const d = haversine(coords.lat, coords.lng, nearest.lat, nearest.lng);
          setSelectedFacility(nearest);
          setDistance(d);
        }
      }
    });
  }, []);

  const handleGetDirections = useCallback(async () => {
    if (!selectedFacility || !userCoords) return;
    setLoading(true);
    try {
      await navigateTo(
        { lat: selectedFacility.lat, lng: selectedFacility.lng },
        selectedFacility.name,
      );
      onFacilitySelected?.(selectedFacility, distance);
    } finally {
      setLoading(false);
    }
  }, [selectedFacility, userCoords, navigateTo, distance, onFacilitySelected]);

  const handleCall = useCallback(() => {
    if (selectedFacility?.phone) {
      window.open(`tel:${selectedFacility.phone}`, "_self");
    }
  }, [selectedFacility]);

  const facilities = getFacilities();

  if (isNavigating || status === "calculating" || status === "arrived") {
    return null; // NavigationPanel takes over
  }

  return (
    <div className="space-y-3" role="region" aria-label="Facility directions">
      {/* Urgency indicator */}
      {assessmentUrgency && (
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
            assessmentUrgency === "red" && "bg-red-500/10 text-red-700 dark:text-red-400",
            assessmentUrgency === "yellow" && "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
            assessmentUrgency === "green" && "bg-green-500/10 text-green-700 dark:text-green-400",
          )}
          role="status"
          aria-live="polite"
        >
          <MapPin className="h-4 w-4" aria-hidden="true" />
          <span>
            {assessmentUrgency === "red"
              ? "Urgent — nearest facility recommended"
              : assessmentUrgency === "yellow"
                ? "Seek care soon — nearby facility:"
                : "Nearest facility:"}
          </span>
        </div>
      )}

      {/* Selected facility card */}
      {selectedFacility && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedFacility.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {selectedFacility.type.replace("_", " ")} • {distance.toFixed(1)}km away
                </p>
                {selectedFacility.capabilities && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedFacility.capabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                      >
                        {cap.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                onClick={handleGetDirections}
                disabled={loading || !userCoords}
                className="flex-1"
                size="sm"
                aria-label={`Get directions to ${selectedFacility.name}`}
              >
                <Navigation className="h-4 w-4 mr-1.5" aria-hidden="true" />
                {loading ? "Calculating..." : "Get Directions"}
              </Button>
              {selectedFacility.phone && (
                <Button onClick={handleCall} variant="outline" size="sm" aria-label={`Call ${selectedFacility.name}`}>
                  <Phone className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Call
                </Button>
              )}
            </div>

            {!userCoords && (
              <p className="text-xs text-muted-foreground mt-2">
                Waiting for GPS location...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show all facilities toggle */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="text-xs text-primary hover:underline"
      >
        {showAll ? "Show fewer" : `Show all ${facilities.length} facilities`}
      </button>

      {/* All facilities list */}
      {showAll && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {facilities
            .filter((f) => f.id !== selectedFacility?.id)
            .map((f) => {
              const d = userCoords
                ? haversine(userCoords.lat, userCoords.lng, f.lat, f.lng)
                : null;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setSelectedFacility(f);
                    if (d) setDistance(d);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.type.replace("_", " ")}
                    {d !== null && ` • ${d.toFixed(1)}km`}
                  </p>
                </button>
              );
            })}
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          Offline — route uses cached road data
        </p>
      )}
    </div>
  );
}
