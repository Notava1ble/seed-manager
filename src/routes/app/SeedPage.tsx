import { useMutation, useQuery } from "convex/react";
import { ArrowRightLeft, Sprout } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
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
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SEED_TYPES } from "@/lib/consts";
import { getErrorMessage } from "@/lib/errors";
import { getLeagueListLabel } from "@/lib/userAccess";

export function SeedPage() {
  const { leagueId, seedId } = useParams();
  const navigate = useNavigate();
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [usedError, setUsedError] = useState<string | null>(null);
  const [leagueChangeError, setLeagueChangeError] = useState<string | null>(
    null,
  );
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  const [isChangingLeague, setIsChangingLeague] = useState(false);
  const [isMarkUsedDialogOpen, setIsMarkUsedDialogOpen] = useState(false);
  const [isChangeLeagueDialogOpen, setIsChangeLeagueDialogOpen] =
    useState(false);
  const [targetLeagueId, setTargetLeagueId] = useState<Id<"leagues"> | null>(
    null,
  );
  const selectedLeagueId = leagueId as Id<"leagues"> | undefined;
  const selectedSeedId = seedId as Id<"seeds"> | undefined;
  const user = useQuery(api.users.currentUser);
  const leagues = useQuery(api.leagues.listLeagues);
  const seed = useQuery(
    api.seeds.getSeedForLeague,
    selectedLeagueId && selectedSeedId
      ? { leagueId: selectedLeagueId, seedId: selectedSeedId }
      : "skip",
  );
  const updateSeedRating = useMutation(api.seeds.updateSeedRating);
  const markSeedUsed = useMutation(api.seeds.markSeedUsed);
  const changeSeedLeague = useMutation(api.seeds.changeSeedLeague);

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

  const handleChangeLeagueDialogOpen = (open: boolean) => {
    setIsChangeLeagueDialogOpen(open);
    setLeagueChangeError(null);

    if (!open) {
      setTargetLeagueId(null);
    }
  };

  const handleChangeLeague = async () => {
    if (!selectedSeedId || !targetLeagueId) {
      return;
    }

    setLeagueChangeError(null);
    setIsChangingLeague(true);

    try {
      await changeSeedLeague({
        seedId: selectedSeedId,
        leagueId: targetLeagueId,
      });
      setIsChangeLeagueDialogOpen(false);
      void navigate(`/app/league/${targetLeagueId}/seed/${selectedSeedId}`);
    } catch (error) {
      setLeagueChangeError(
        getErrorMessage(error, "Could not change this seed's league"),
      );
    } finally {
      setIsChangingLeague(false);
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

  const currentLeague = leagues?.find((league) => league._id === seed.leagueId);
  const canChangeLeagueAssignment =
    leagues !== undefined && canChangeLeague(seed, user);
  const targetLeague = leagues?.find((league) => league._id === targetLeagueId);
  const vouchedByName = seed.vouchedByUser?.name ?? "an unknown player";
  const vouchedByHomeLeagues = getLeagueListLabel(
    leagues ?? [],
    seed.vouchedByUser?.homeLeagueId,
  );
  const vouchedByHostLeagues = getLeagueListLabel(
    leagues ?? [],
    seed.vouchedByUser?.hostLeagueId,
  );
  const currentLeagueName = currentLeague?.leagueName ?? "this league";
  const targetLeagueName = targetLeague?.leagueName ?? "the selected league";

  return (
    <>
      <AlertDialog
        open={isMarkUsedDialogOpen}
        onOpenChange={setIsMarkUsedDialogOpen}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="min-w-0 text-xl font-semibold leading-tight">
                {seed.type ? SEED_TYPES[seed.type] : "Unspecified seed"}
              </h2>
              {user!.roles.includes("admin") && seed.vouchedByUser && (
                <span className="text-sm text-muted-foreground">
                  Vouched by {seed.vouchedByUser.name ?? "Unknown user"}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canChangeLeagueAssignment && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Change seed league"
                        size="icon-sm"
                        variant="ghost"
                      />
                    }
                    onClick={() => handleChangeLeagueDialogOpen(true)}
                    type="button"
                  >
                    <ArrowRightLeft />
                  </TooltipTrigger>
                  <TooltipContent>Change seed league</TooltipContent>
                </Tooltip>
              )}
              {seed.isUsed && <SeedStatusBadge status="used" />}
            </div>
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
          {leagueChangeError && !isChangeLeagueDialogOpen && (
            <p className="text-xs text-destructive">{leagueChangeError}</p>
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
            This action cannot be undone. Used seeds stay visible in history,
            but they leave active league selection.
          </AlertDialogDescription>
          {usedError && <p className="text-xs text-destructive">{usedError}</p>}
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

      <AlertDialog
        open={isChangeLeagueDialogOpen}
        onOpenChange={handleChangeLeagueDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Change this seed's league?</AlertDialogTitle>
          <AlertDialogDescription>
            <p>
              Moving a seed means that for the time this seed was in{" "}
              {currentLeagueName}, it was visible to testers who play in the
              target league.
            </p>
            <p className="mt-2">
              Vouched by <b>{vouchedByName}</b>.
            </p>
            <p className="mt-2">
              Home leagues: <b>{vouchedByHomeLeagues}</b>.
            </p>
            <p className="mt-2">
              Host leagues: <b>{vouchedByHostLeagues}</b>.
            </p>
            {targetLeagueId &&
              seed.vouchedByUser?.homeLeagueId.includes(targetLeagueId) && (
                <p className="mt-4 text-destructive">
                  Warning: <b>{vouchedByName}</b> is a player in the target
                  league, so they will play the seed they tested, which is
                  unfair.
                </p>
              )}
          </AlertDialogDescription>

          <Select
            value={targetLeagueId}
            itemToStringLabel={(leagueId) =>
              leagues?.find((league) => league._id === leagueId)?.leagueName ??
              "Unknown league"
            }
            onValueChange={setTargetLeagueId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a new league" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Available leagues</SelectLabel>
                {(leagues ?? []).map((league) => (
                  <SelectItem
                    key={league._id}
                    disabled={league._id === seed.leagueId}
                    value={league._id}
                  >
                    {league.leagueName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {targetLeague && (
            <p className="text-xs text-muted-foreground">
              The seed will move to {targetLeagueName}.
            </p>
          )}
          {leagueChangeError && (
            <p className="text-xs text-destructive">{leagueChangeError}</p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingLeague}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!targetLeagueId || isChangingLeague}
              onClick={() => void handleChangeLeague()}
              variant="destructive"
            >
              {isChangingLeague ? "Changing league" : "Change league"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
    roles: Array<"admin" | "host" | "tester" | "uploader">;
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
    roles: Array<"admin" | "host" | "tester" | "uploader">;
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

function canChangeLeague(
  seed: {
    leagueId?: Id<"leagues">;
    isExpired?: boolean;
    isUsed: boolean;
    rating?: SeedRating;
  },
  user: {
    roles: Array<"admin" | "host" | "tester" | "uploader">;
  } | null,
) {
  return (
    Boolean(user?.roles.includes("admin")) &&
    seed.leagueId !== undefined &&
    seed.isExpired !== true &&
    !seed.isUsed &&
    seed.rating === "Good"
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
