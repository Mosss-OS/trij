import type { Urgency } from "@/types/trij";
import { cn } from "@/lib/utils";

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

export function UrgencyPill({ urgency, className }: { urgency: Urgency; className?: string }) {
  return (
    <span className={cn("urgency-pill", styles[urgency], className)}>
      <span
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-urgency-green": urgency === "green",
          "bg-urgency-yellow": urgency === "yellow",
          "bg-urgency-red": urgency === "red",
        })}
      />
      {labels[urgency]}
    </span>
  );
}
