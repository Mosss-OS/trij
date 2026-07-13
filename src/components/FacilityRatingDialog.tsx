/**
 * FacilityRatingDialog — post-visit rating form for facilities.
 */

import { useState } from "react";
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { rateFacility, type FacilityRating } from "@/lib/navigation/facility-ratings";
import { toast } from "sonner";

interface FacilityRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: string;
  facilityName: string;
  tripId?: number;
}

export function FacilityRatingDialog({
  open,
  onOpenChange,
  facilityId,
  facilityName,
  tripId,
}: FacilityRatingDialogProps) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(0 as any);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [staffHelpful, setStaffHelpful] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await rateFacility({
        facilityId,
        facilityName,
        tripId,
        rating,
        comment: comment || undefined,
        staffHelpful: staffHelpful ?? undefined,
        wouldRecommend: wouldRecommend ?? undefined,
        completedAt: new Date().toISOString(),
      });
      toast.success("Thank you for your feedback!");
      onOpenChange(false);
      setRating(0 as any);
      setComment("");
      setStaffHelpful(null);
      setWouldRecommend(null);
    } catch {
      toast.error("Failed to save rating");
    } finally {
      setSubmitting(false);
    }
  };

  const labels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Rate {facilityName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star rating */}
          <div className="text-center">
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className="p-1"
                  onMouseEnter={() => setHoveredStar(s)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => setRating(s as 1 | 2 | 3 | 4 | 5)}
                  aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      s <= (hoveredStar || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {labels[rating]}
              </p>
            )}
          </div>

          {/* Quick toggles */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStaffHelpful(staffHelpful === true ? null : true)}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition-colors ${
                staffHelpful === true
                  ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-400"
                  : "hover:bg-muted/50"
              }`}
              aria-pressed={staffHelpful === true}
            >
              <ThumbsUp className="h-4 w-4" /> Helpful staff
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(wouldRecommend === true ? null : true)}
              className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm transition-colors ${
                wouldRecommend === true
                  ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-400"
                  : "hover:bg-muted/50"
              }`}
              aria-pressed={wouldRecommend === true}
            >
              <ThumbsUp className="h-4 w-4" /> Would recommend
            </button>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" /> Optional comment
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your experience?"
              className="text-sm"
              rows={2}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="w-full"
          >
            {submitting ? "Saving..." : "Submit Rating"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
