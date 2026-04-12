import { ArrowBigDown, ArrowBigUp, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "@/components/ui/button-group";
import { cn } from "@/lib/utils";

type SeedFeedbackActionsProps = {
  upvotes: number;
  downvotes: number;
  comments: number;
  className?: string;
  onUpvote?: () => void;
  onDownvote?: () => void;
  onComment?: () => void;
};

export function SeedVoting({
  upvotes,
  downvotes,
  comments,
  className,
  onUpvote,
  onDownvote,
  onComment,
}: SeedFeedbackActionsProps) {
  return (
    <div className="flex items-center gap-3 w-full justify-between">
      <ButtonGroup
        aria-label="Seed feedback actions"
        className={cn("shadow-xs", className)}
      >
        <Button
          aria-label={`Upvote seed. ${upvotes} upvotes`}
          onClick={onUpvote}
          size="lg"
          type="button"
          variant="outline"
        >
          <ArrowBigUp data-icon="inline-start" />
          <span className="tabular-nums">{upvotes}</span>
          <span className="sr-only">upvotes</span>
        </Button>
        <Button
          aria-label={`Downvote seed. ${downvotes} downvotes`}
          onClick={onDownvote}
          size="lg"
          type="button"
          variant="outline"
        >
          <ArrowBigDown data-icon="inline-start" />
          <span className="tabular-nums">{downvotes}</span>
          <span className="sr-only">downvotes</span>
        </Button>
      </ButtonGroup>
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
