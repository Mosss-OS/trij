import { useState, useRef, type MouseEvent } from "react";
import type { VisualFeatureRegion } from "@/types/trij";
import { useI18n } from "@/lib/i18n";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  imageUrl: string;
  regions: VisualFeatureRegion[];
}

const REGION_COLORS = [
  "rgba(59, 130, 246, 0.25)",
  "rgba(239, 68, 68, 0.25)",
  "rgba(34, 197, 94, 0.25)",
  "rgba(234, 179, 8, 0.25)",
  "rgba(168, 85, 247, 0.25)",
  "rgba(236, 72, 153, 0.25)",
  "rgba(20, 184, 166, 0.25)",
  "rgba(249, 115, 22, 0.25)",
];

const BORDER_COLORS = [
  "rgb(59, 130, 246)",
  "rgb(239, 68, 68)",
  "rgb(34, 197, 94)",
  "rgb(234, 179, 8)",
  "rgb(168, 85, 247)",
  "rgb(236, 72, 153)",
  "rgb(20, 184, 166)",
  "rgb(249, 115, 22)",
];

export function SaliencyOverlay({ imageUrl, regions }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  if (regions.length === 0) return null;

  const handleRegionClick = (e: MouseEvent, index: number) => {
    e.stopPropagation();
    setSelected(selected === index ? null : index);
  };

  const handleContainerClick = () => {
    setSelected(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVisible(!visible)}
          className="gap-1.5 text-xs"
        >
          {visible ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {visible ? t("hideSaliency") : t("showSaliency")}
        </Button>
      </div>

      <div
        ref={containerRef}
        className="relative inline-block w-full cursor-default"
        onClick={handleContainerClick}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Assessment image with feature overlay"
          className="aspect-video w-full rounded-2xl object-cover"
          draggable={false}
        />
        {visible && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {regions.map((region, i) => {
              const color = region.color || REGION_COLORS[i % REGION_COLORS.length];
              const borderColor = BORDER_COLORS[i % BORDER_COLORS.length];
              const isSelected = selected === i;
              return (
                <rect
                  key={region.label}
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  fill={color}
                  stroke={borderColor}
                  strokeWidth={isSelected ? 1.5 : 0.75}
                  strokeOpacity={0.9}
                  className="pointer-events-auto cursor-pointer transition-opacity duration-200 hover:opacity-80"
                  style={{ opacity: isSelected ? 1 : 0.85 }}
                  onClick={(e) => handleRegionClick(e as unknown as MouseEvent, i)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {visible && selected !== null && regions[selected] && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="mb-0.5 font-medium text-primary">
            {regions[selected].label}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {regions[selected].description}
          </p>
        </div>
      )}
    </div>
  );
}
