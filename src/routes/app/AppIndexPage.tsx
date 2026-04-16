import { ConvexError } from "convex/values";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
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
import { SEED_TYPES } from "@/lib/consts";
import { Sprout } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function AppIndexPage() {
  const [selectedLeagueId, setSelectedLeagueId] =
    useState<Id<"leagues"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isVouching, setIsVouching] = useState(false);

  const user = useQuery(api.users.currentUser);
  const leagues = useQuery(api.leagues.listLeagues);
  const claimedSeed = useQuery(api.seeds.getCurrentClaimedSeed);
  const claimSeed = useMutation(api.seeds.claimSeed);
  const vouchSeed = useMutation(api.seeds.vouchSeed);

  const isTester = user?.roles.includes("tester") ?? false;
  const isLoading =
    user === undefined || leagues === undefined || claimedSeed === undefined;

  const handleClaimSeed = async () => {
    setError(null);
    setIsClaiming(true);

    try {
      await claimSeed({});
    } catch (claimError) {
      setError(getConvexErrorMessage(claimError, "Could not claim a seed"));
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
      setError(getConvexErrorMessage(vouchError, "Could not vouch this seed"));
    } finally {
      setIsVouching(false);
    }
  };

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
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
                  <SeedValue label="Overworld" value={claimedSeed.overworld} />
                  <SeedValue label="Nether" value={claimedSeed.nether} />
                  <SeedValue label="End" value={claimedSeed.end} />
                  <SeedValue label="RNG" value={claimedSeed.rng} />
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
                  disabled={isVouching || !selectedLeagueId}
                  onClick={() => void handleVouch("Good")}
                  type="button"
                >
                  Vouch good
                </Button>
                <Button
                  disabled={isVouching}
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
                  <Button
                    disabled={isClaiming}
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
    </div>
  );
}

function SeedValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-xs">{value}</p>
    </div>
  );
}

function getConvexErrorMessage(error: unknown, fallback: string) {
  return error instanceof ConvexError ? error.data.message : fallback;
}
