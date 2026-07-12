/**
 * OfflineGraphStatus — shows which road graphs are cached and
 * allows pre-downloading additional regions.
 */

import { useState, useEffect } from "react";
import { Download, Check, MapPin, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listStoredGraphs } from "@/lib/navigation/road-graph-store";
import { SAMPLE_GRAPHS } from "@/lib/navigation/road-graph";
import { storeRoadGraph } from "@/lib/navigation/road-graph-store";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

export function OfflineGraphStatus() {
  const [cached, setCached] = useState<Array<{ id: string; region: string }>>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    listStoredGraphs().then((graphs) => setCached(graphs));
  }, []);

  const handleDownload = async (graphId: string) => {
    const graph = SAMPLE_GRAPHS.find((g) => g.id === graphId);
    if (!graph) return;
    setDownloading(graphId);
    try {
      await storeRoadGraph(graph);
      const updated = await listStoredGraphs();
      setCached(updated);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Offline Maps</h4>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {isOnline ? (
            <>
              <Wifi className="h-3 w-3 text-green-500" />
              Online
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-yellow-500" />
              Offline
            </>
          )}
        </span>
      </div>

      <div className="space-y-2">
        {SAMPLE_GRAPHS.map((graph) => {
          const isCached = cached.some((c) => c.id === graph.id);
          const isDownloadingThis = downloading === graph.id;

          return (
            <div
              key={graph.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">{graph.region}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {graph.nodes.length} road nodes • {graph.edges.length} segments
                  </p>
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
                  onClick={() => handleDownload(graph.id)}
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
