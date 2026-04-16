import { MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type SeedRating = "Good" | "Bad";

type SeedRatingActionsProps = {
  rating?: SeedRating;
  comments: number;
  canEditRating?: boolean;
  className?: string;
  onRatingChange?: (rating: SeedRating) => void;
  onComment?: () => void;
};

export function SeedRatingActions({
  rating,
  comments,
  canEditRating = false,
  className,
  onRatingChange,
  onComment,
}: SeedRatingActionsProps) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
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
      <Button
        aria-label={`Open comments. ${comments} comments`}
        onClick={onComment}
        size="lg"
        type="button"
        variant="outline"
      >
        <MessageCircle data-icon="inline-start" />
        <span className="tabular-nums">{comments}</span>
        <span>Comments</span>
      </Button>
    </div>
  );
}
