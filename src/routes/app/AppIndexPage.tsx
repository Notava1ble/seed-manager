import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SeedCommentsSection } from "@/components/SeedCommentsSection";
import { SeedValueDisplay } from "@/components/SeedValueDisplay";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PauseCircle, Sprout } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getErrorMessage } from "@/lib/errors";
import { SEED_TYPES, seedTypesArray, type SeedType } from "@/lib/consts";

type ClaimType = "RANDOM" | SeedType;

export function AppIndexPage() {
  const [selectedLeagueId, setSelectedLeagueId] =
    useState<Id<"leagues"> | null>(null);
  const [claimType, setClaimType] = useState<ClaimType>("RANDOM");
  const [error, setError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVouching, setIsVouching] = useState(false);

  const user = useQuery(api.users.currentUser);
  const leagues = useQuery(api.leagues.listLeagues);
  const claimedSeed = useQuery(api.seeds.getCurrentClaimedSeed);
  const settings = useQuery(api.settings.current);
  const claimSeed = useMutation(api.seeds.claimSeed);
  const vouchSeed = useMutation(api.seeds.vouchSeed);

  const isTester = user?.roles.includes("tester") ?? false;
  const isTestingUnavailable =
    settings === null || (settings?.seedTestingPaused ?? false);
  const isLoading =
    user === undefined ||
    leagues === undefined ||
    claimedSeed === undefined ||
    settings === undefined;

  const handleClaimSeed = async () => {
    setError(null);
    setIsClaiming(true);

    try {
      await claimSeed({ claimType });
      setClaimType("RANDOM");
    } catch (claimError) {
      setError(getErrorMessage(claimError, "Could not claim a seed"));
    } finally {
      setIsClaiming(false);
    }
  };

  const handleVouch = async (rating: "Good" | "Bad") => {
    if (!claimedSeed) {
      return;
    }

    setError(null);
    setIsVouching(true);

    try {
      await vouchSeed({
        seedId: claimedSeed._id,
        rating,
        ...(rating === "Good" && selectedLeagueId
          ? { leagueId: selectedLeagueId }
          : {}),
      });
      setSelectedLeagueId(null);
    } catch (vouchError) {
      setError(getErrorMessage(vouchError, "Could not vouch this seed"));
    } finally {
      setIsVouching(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
      <Card className="w-full min-w-0 max-w-3xl lg:w-3xl lg:max-w-none lg:flex-none">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="grid gap-1">
            <CardTitle>Seed vouching</CardTitle>
            <CardDescription>
              Claim one unassigned seed, test it, then vouch it as good or bad.
            </CardDescription>
          </div>
          <Badge variant={claimedSeed ? "default" : "secondary"}>
            {claimedSeed ? "Claimed" : "No claim"}
          </Badge>
        </CardHeader>
        <CardContent>
          {settings === null && (
            <Alert className="mb-4">
              <PauseCircle />
              <AlertTitle>Seed testing is unavailable</AlertTitle>
              <AlertDescription>
                Tournament settings need to be initialized before testing can
                start.
              </AlertDescription>
            </Alert>
          )}

          {settings?.seedTestingPaused && (
            <Alert className="mb-4">
              <PauseCircle />
              <AlertTitle>Seed testing is paused</AlertTitle>
              <AlertDescription>
                Claims and vouching will resume after an admin starts testing.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !isTester ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Tester access is required to claim seeds.
              </p>
            </div>
          ) : claimedSeed ? (
            <div className="grid gap-6">
              <div className="flex flex-col rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="grid gap-1">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Claimed seed
                    </p>
                    <p className="text-sm font-semibold">
                      {claimedSeed.type
                        ? SEED_TYPES[claimedSeed.type]
                        : "Unspecified seed"}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-background">
                    Testing
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-y-4 pt-4 sm:grid-cols-4">
                  <SeedValueDisplay
                    label="Overworld"
                    value={claimedSeed.overworld}
                  />
                  <SeedValueDisplay label="Nether" value={claimedSeed.nether} />
                  <SeedValueDisplay label="End" value={claimedSeed.end} />
                  <SeedValueDisplay label="RNG" value={claimedSeed.rng} />
                </div>
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="vouch-league">
                    League assignment
                  </FieldLabel>
                  <Select
                    value={selectedLeagueId}
                    itemToStringLabel={(leagueId) =>
                      leagues.find((league) => league._id === leagueId)
                        ?.leagueName ?? "Unknown league"
                    }
                    onValueChange={(value) => setSelectedLeagueId(value)}
                  >
                    <SelectTrigger id="vouch-league" className="w-full sm:w-70">
                      <SelectValue placeholder="Choose league" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Available Leagues</SelectLabel>
                        {leagues.map((league) => (
                          <SelectItem key={league._id} value={league._id}>
                            {league.leagueName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Required only when vouching the seed as good.
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  disabled={
                    isVouching || isTestingUnavailable || !selectedLeagueId
                  }
                  onClick={() => void handleVouch("Good")}
                  type="button"
                >
                  Vouch good
                </Button>
                <Button
                  disabled={isVouching || isTestingUnavailable}
                  onClick={() => void handleVouch("Bad")}
                  type="button"
                  variant="destructive"
                >
                  Vouch bad
                </Button>
              </div>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <Sprout />
                </EmptyMedia>

                <EmptyTitle>No active claim</EmptyTitle>
                <EmptyDescription>
                  You don't have any seeds to test right now.
                </EmptyDescription>
                <EmptyContent>
                  <FieldGroup className="mt-2">
                    <Field>
                      <Select
                        value={claimType}
                        itemToStringLabel={(value) =>
                          value === "RANDOM" ? "Random" : SEED_TYPES[value]
                        }
                        onValueChange={(value) => {
                          if (value) {
                            setClaimType(value);
                          }
                        }}
                      >
                        <SelectTrigger id="claim-seed-type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Claim type</SelectLabel>
                            <SelectItem value="RANDOM">Random</SelectItem>
                            {seedTypesArray.map((type) => (
                              <SelectItem key={type} value={type}>
                                {SEED_TYPES[type]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </FieldGroup>
                  <Button
                    disabled={isClaiming || isTestingUnavailable}
                    onClick={() => void handleClaimSeed()}
                    type="button"
                    variant="secondary"
                    className="mt-2"
                  >
                    {isClaiming ? "Claiming..." : "Claim new seed"}
                  </Button>
                </EmptyContent>
              </EmptyHeader>
            </Empty>
          )}

          {error && <FieldError className="mt-4">{error}</FieldError>}
        </CardContent>
      </Card>

      {claimedSeed && (
        <Card className="flex min-w-0 flex-col overflow-hidden lg:sticky lg:top-0 lg:h-[calc(100svh-7rem)] lg:flex-1 lg:self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Comments</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-3">
            <SeedCommentsSection
              canCreateComments={
                user?.roles.includes("tester") ||
                user?.roles.includes("host") ||
                false
              }
              className="h-72 min-h-0 lg:h-full lg:flex-1"
              seedId={claimedSeed._id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
