import { CheckCircle2, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SeedRating } from "@/lib/seedStatus";
import { cn } from "@/lib/utils";

type SeedRatingActionsProps = {
  rating?: SeedRating;
  canEditRating?: boolean;
  canMarkUsed?: boolean;
  isMarkingUsed?: boolean;
  isUsed?: boolean;
  className?: string;
  onRatingChange?: (rating: SeedRating) => void;
  onMarkUsed?: () => void;
};

export function SeedRatingActions({
  rating,
  canEditRating = false,
  canMarkUsed = false,
  isMarkingUsed = false,
  isUsed = false,
  className,
  onRatingChange,
  onMarkUsed,
}: SeedRatingActionsProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <ToggleGroup
        aria-label="Seed rating"
        className={cn("shadow-xs", className)}
        disabled={!canEditRating}
        onValueChange={(value) => {
          const nextRating = value[value.length - 1];

          if (nextRating !== "Good" && nextRating !== "Bad") {
            return;
          }

          if (nextRating !== rating) {
            onRatingChange?.(nextRating);
          }
        }}
        value={rating ? [rating] : []}
        variant="outline"
      >
        <ToggleGroupItem aria-label="Mark seed good" size="lg" value="Good">
          <ThumbsUp data-icon="inline-start" />
          Good
        </ToggleGroupItem>
        <ToggleGroupItem aria-label="Mark seed bad" size="lg" value="Bad">
          <ThumbsDown data-icon="inline-start" />
          Bad
        </ToggleGroupItem>
      </ToggleGroup>
      {canMarkUsed ? (
        <Button
          aria-label={isUsed ? "Seed already used" : "Mark seed as used"}
          disabled={isUsed || isMarkingUsed}
          onClick={onMarkUsed}
          size="lg"
          type="button"
          variant={isUsed ? "outline" : "destructive"}
        >
          <CheckCircle2 data-icon="inline-start" />
          {isUsed ? "Seed used" : isMarkingUsed ? "Marking used" : "Mark as Used"}
        </Button>
      ) : null}
    </div>
  );
}
