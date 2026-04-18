import { Badge } from "@/components/ui/badge";
import type { SeedRating } from "@/lib/seedStatus";

export function SeedRatingBadge({ rating }: { rating?: SeedRating }) {
  if (!rating) {
    return <Badge variant="outline">Unrated</Badge>;
  }

  return (
    <Badge variant={rating === "Good" ? "secondary" : "destructive"}>
      {rating}
    </Badge>
  );
}
