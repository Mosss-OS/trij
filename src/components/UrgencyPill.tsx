import type { Urgency } from "@/types/trij";
import { cn } from "@/lib/utils";
import { UrgencyLow, UrgencyMedium, UrgencyHigh } from "./PictogramIcons";
import { useSettingsStore } from "@/stores/settingsStore";

const styles: Record<Urgency, string> = {
  green: "bg-urgency-green-bg text-urgency-green",
  yellow: "bg-urgency-yellow-bg text-urgency-yellow",
  red: "bg-urgency-red-bg text-urgency-red",
};

const labels: Record<Urgency, string> = {
  green: "Routine",
  yellow: "Soon",
  red: "Urgent",
};

const pictogramIcons: Record<Urgency, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  green: UrgencyLow,
  yellow: UrgencyMedium,
  red: UrgencyHigh,
};

const pictogramLabels: Record<Urgency, string> = {
  green: "+",
  yellow: "!",
  red: "!!",
};

export function UrgencyPill({ urgency, className }: { urgency: Urgency; className?: string }) {
  const pictogramMode = useSettingsStore((s) => s.pictogramMode);
  const PictogramIcon = pictogramIcons[urgency];
  
  return (
    <span className={cn("urgency-pill", styles[urgency], className)}>
      {pictogramMode ? (
        <>
          <PictogramIcon className="h-5 w-5" />
          <span className="ml-1">{pictogramLabels[urgency]}</span>
        </>
      ) : (
        <>
          <span
            className={cn("h-1.5 w-1.5 rounded-full", {
              "bg-urgency-green": urgency === "green",
              "bg-urgency-yellow": urgency === "yellow",
              "bg-urgency-red": urgency === "red",
            })}
          />
          {labels[urgency]}
        </>
      )}
    </span>
  );
}
