import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Sprout } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
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
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Seed Details
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">
            {seed.type ? SEED_TYPES[seed.type] : "Unspecified seed"}
          </h2>
          {seed.isUsed && <SeedStatusBadge status="used" />}
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <SeedValueDisplay label="Overworld" value={seed.overworld} />
        <SeedValueDisplay label="Nether" value={seed.nether} />
        <SeedValueDisplay label="End" value={seed.end} />
        <SeedValueDisplay label="RNG" value={seed.rng} />
      </div>

      <div className="pt-2">
        <SeedRatingActions
          canEditRating={canEditRating(seed, user)}
          comments={seed.commentCount}
          onRatingChange={(rating) => {
            void handleRatingChange(rating);
          }}
          rating={seed.rating}
        />
      </div>
      {ratingError && <p className="text-xs text-destructive">{ratingError}</p>}

      {canMarkUsed(seed, user) && (
        <>
          <Separator />
          <div className="flex flex-col items-start gap-2">
            <AlertDialog
              open={isMarkUsedDialogOpen}
              onOpenChange={setIsMarkUsedDialogOpen}
            >
              <Button
                disabled={seed.isUsed || isMarkingUsed}
                onClick={() => {
                  setUsedError(null);
                  setIsMarkUsedDialogOpen(true);
                }}
                type="button"
                variant={seed.isUsed ? "outline" : "destructive"}
              >
                <CheckCircle2 data-icon="inline-start" />
                {seed.isUsed ? "Seed marked used" : "Mark seed used"}
              </Button>
              <AlertDialogContent>
                <AlertDialogTitle>Mark this seed as used?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Used seeds stay visible in
                  history, but they leave active league selection.
                </AlertDialogDescription>
                {usedError && (
                  <p className="text-xs text-destructive">{usedError}</p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isMarkingUsed}>
                    Cancel
                  </AlertDialogCancel>
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
            <p className="text-xs text-muted-foreground">
              Used seeds stay visible in history, but leave active league
              selection.
            </p>
            {usedError && !isMarkUsedDialogOpen && (
              <p className="text-xs text-destructive">{usedError}</p>
            )}
          </div>
        </>
      )}
      {/* TODO: Comments section */}
    </div>
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
  },
  user: {
    roles: Array<"admin" | "host" | "tester">;
    hostLeagueId?: Id<"leagues">[];
  } | null,
) {
  if (!user || seed.leagueId === undefined || seed.isExpired) {
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
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-52" />
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
