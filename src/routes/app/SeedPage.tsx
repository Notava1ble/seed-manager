import { useMutation, useQuery } from "convex/react";
import { Sprout } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SeedCommentsSection } from "@/components/SeedCommentsSection";
import { SeedRatingActions } from "@/components/SeedFeedbackActions";
import { SeedRating } from "@/lib/seedStatus";
import { SeedStatusBadge } from "@/components/SeedStatusBadge";
import { SeedValueDisplay } from "@/components/SeedValueDisplay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { SEED_TYPES } from "@/lib/consts";
import { getErrorMessage } from "@/lib/errors";

export function SeedPage() {
  const { leagueId, seedId } = useParams();
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [usedError, setUsedError] = useState<string | null>(null);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  const [isMarkUsedDialogOpen, setIsMarkUsedDialogOpen] = useState(false);
  const selectedLeagueId = leagueId as Id<"leagues"> | undefined;
  const selectedSeedId = seedId as Id<"seeds"> | undefined;
  const user = useQuery(api.users.currentUser);
  const seed = useQuery(
    api.seeds.getSeedForLeague,
    selectedLeagueId && selectedSeedId
      ? { leagueId: selectedLeagueId, seedId: selectedSeedId }
      : "skip",
  );
  const updateSeedRating = useMutation(api.seeds.updateSeedRating);
  const markSeedUsed = useMutation(api.seeds.markSeedUsed);

  const handleRatingChange = async (rating: SeedRating) => {
    if (!selectedSeedId) {
      return;
    }

    setRatingError(null);

    try {
      await updateSeedRating({ seedId: selectedSeedId, rating });
    } catch (error) {
      setRatingError(
        getErrorMessage(error, "Could not update this seed's rating"),
      );
    }
  };

  const handleMarkUsed = async () => {
    if (!selectedSeedId) {
      return;
    }

    setUsedError(null);
    setIsMarkingUsed(true);

    try {
      await markSeedUsed({ seedId: selectedSeedId });
      setIsMarkUsedDialogOpen(false);
    } catch (error) {
      setUsedError(getErrorMessage(error, "Could not mark this seed used"));
    } finally {
      setIsMarkingUsed(false);
    }
  };

  if (seed === undefined || user === undefined) {
    return <SeedDetailsSkeleton />;
  }

  if (!seed) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sprout />
          </EmptyMedia>
          <EmptyTitle>Seed not found</EmptyTitle>
          <EmptyDescription>
            This seed is not assigned to the current league.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <AlertDialog
      open={isMarkUsedDialogOpen}
      onOpenChange={setIsMarkUsedDialogOpen}
    >
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 text-xl font-semibold leading-tight">
            {seed.type ? SEED_TYPES[seed.type] : "Unspecified seed"}
          </h2>
          {seed.isUsed && <SeedStatusBadge status="used" />}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SeedValueDisplay label="Overworld" value={seed.overworld} />
          <SeedValueDisplay label="Nether" value={seed.nether} />
          <SeedValueDisplay label="End" value={seed.end} />
          <SeedValueDisplay label="RNG" value={seed.rng} />
        </div>

        <SeedRatingActions
          canEditRating={canEditRating(seed, user)}
          canMarkUsed={canMarkUsed(seed, user)}
          isMarkingUsed={isMarkingUsed}
          isUsed={seed.isUsed}
          onMarkUsed={() => {
            setUsedError(null);
            setIsMarkUsedDialogOpen(true);
          }}
          onRatingChange={(rating) => {
            void handleRatingChange(rating);
          }}
          rating={seed.rating}
        />

        {ratingError && (
          <p className="text-xs text-destructive">{ratingError}</p>
        )}
        {usedError && !isMarkUsedDialogOpen && (
          <p className="text-xs text-destructive">{usedError}</p>
        )}

        <div className="flex min-h-0 flex-1 flex-col border-t pt-3">
          <SeedCommentsSection
            autoFocus
            canCreateComments={
              user?.roles.includes("tester") ||
              user?.roles.includes("host") ||
              false
            }
            className="min-h-0 flex-1"
            seedId={seed._id}
          />
        </div>
      </div>

      <AlertDialogContent>
        <AlertDialogTitle>Mark this seed as used?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. Used seeds stay visible in history, but
          they leave active league selection.
        </AlertDialogDescription>
        {usedError && <p className="text-xs text-destructive">{usedError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isMarkingUsed}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isMarkingUsed}
            onClick={() => void handleMarkUsed()}
            variant="destructive"
          >
            {isMarkingUsed ? "Marking used" : "Mark used"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function canEditRating(
  seed: {
    claimedBy?: Id<"users">;
    leagueId?: Id<"leagues">;
    isExpired?: boolean;
    isUsed: boolean;
  },
  user: {
    _id: Id<"users">;
    roles: Array<"admin" | "host" | "tester">;
    hostLeagueId?: Id<"leagues">[];
  } | null,
) {
  if (!user) {
    return false;
  }

  if (seed.isExpired || seed.isUsed) {
    return false;
  }

  if (user.roles.includes("admin")) {
    return true;
  }

  if (seed.claimedBy === user._id) {
    return true;
  }

  return (
    seed.leagueId !== undefined &&
    user.roles.includes("host") &&
    (user.hostLeagueId ?? []).includes(seed.leagueId)
  );
}

function canMarkUsed(
  seed: {
    leagueId?: Id<"leagues">;
    isExpired?: boolean;
    isUsed: boolean;
    rating?: SeedRating;
  },
  user: {
    roles: Array<"admin" | "host" | "tester">;
    hostLeagueId?: Id<"leagues">[];
  } | null,
) {
  if (
    !user ||
    seed.leagueId === undefined ||
    seed.isExpired ||
    seed.rating !== "Good"
  ) {
    return false;
  }

  if (user.roles.includes("admin")) {
    return true;
  }

  return (
    user.roles.includes("host") &&
    (user.hostLeagueId ?? []).includes(seed.leagueId)
  );
}

function SeedDetailsSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Skeleton className="h-8 w-52" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="min-h-0 flex-1 w-full" />
    </div>
  );
}
