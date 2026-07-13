/**
 * OfflineGraphStatus — shows which road graphs are cached and
 * allows pre-downloading additional regions.
 */

import { useState, useEffect } from "react";
import { Download, Check, MapPin, Wifi, WifiOff, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listStoredGraphs } from "@/lib/navigation/road-graph-store";
import { REGIONS, loadGraphFromNetwork } from "@/lib/navigation/road-graph";
import { storeRoadGraph } from "@/lib/navigation/road-graph-store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

interface CachedGraph {
  id: string;
  region: string;
}

export function OfflineGraphStatus() {
  const [cached, setCached] = useState<CachedGraph[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    listStoredGraphs().then((graphs) => setCached(graphs));
  }, []);

  const handleDownload = async (regionId: string) => {
    setDownloading(regionId);
    try {
      const graph = await loadGraphFromNetwork(regionId);
      if (graph) {
        await storeRoadGraph(graph);
        const updated = await listStoredGraphs();
        setCached(updated);
      }
    } finally {
      setDownloading(null);
    }
  };

  const cachedCount = cached.length;
  const totalRegions = REGIONS.length;

  return (
    <div className="space-y-3" role="region" aria-label="Offline road data status">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Offline Maps</h4>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <HardDrive className="h-3 w-3" />
            {cachedCount}/{totalRegions}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" aria-hidden="true" />
                <span className="sr-only">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-yellow-500" aria-hidden="true" />
                <span className="sr-only">Offline</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {REGIONS.map((region) => {
          const isCached = cached.some((c) => c.id === region.id);
          const isDownloadingThis = downloading === region.id;

          return (
            <div
              key={region.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">{region.region}</p>
                </div>
              </div>

              {isCached ? (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  Cached
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(region.id)}
                  disabled={isDownloadingThis || !isOnline}
                  className="h-7 text-xs"
                >
                  {isDownloadingThis ? (
                    <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Cache
                    </>
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {!isOnline && (
        <p className="text-[10px] text-muted-foreground">
          Connect to internet to download road data for offline use.
        </p>
      )}
    </div>
  );
}
