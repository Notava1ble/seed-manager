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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SEED_TYPES } from "@/lib/consts";

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
    <section className="flex flex-col gap-6">
      <section className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Seed vouching</h2>
            <p className="text-sm text-muted-foreground">
              Claim one unassigned seed, test it, then vouch it as good or bad.
            </p>
          </div>
          <Badge variant="outline">
            {claimedSeed ? "Seed claimed" : "No active claim"}
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : !isTester ? (
          <p className="text-sm text-muted-foreground">
            Tester access is required to claim seeds.
          </p>
        ) : claimedSeed ? (
          <div className="flex flex-col gap-4 rounded-md border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                  Claimed seed
                </p>
                <h3 className="text-lg font-semibold">
                  {claimedSeed.type
                    ? SEED_TYPES[claimedSeed.type]
                    : "Unspecified seed"}
                </h3>
              </div>
              <Badge variant="secondary">Testing</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SeedValue label="Overworld" value={claimedSeed.overworld} />
              <SeedValue label="Nether" value={claimedSeed.nether} />
              <SeedValue label="End" value={claimedSeed.end} />
              <SeedValue label="RNG" value={claimedSeed.rng} />
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="vouch-league">
                  Choose league to asign to
                </FieldLabel>
                <Select
                  value={selectedLeagueId}
                  itemToStringLabel={(leagueId) =>
                    leagues.find((league) => league._id === leagueId)
                      ?.leagueName ?? "Unknown league"
                  }
                  onValueChange={(value) => setSelectedLeagueId(value)}
                >
                  <SelectTrigger id="vouch-league" className="w-full">
                    <SelectValue placeholder="Choose league" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>League assignment</SelectLabel>
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

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isVouching}
                onClick={() => void handleVouch("Bad")}
                type="button"
                variant="destructive"
              >
                Vouch bad
              </Button>
              <Button
                disabled={isVouching || !selectedLeagueId}
                onClick={() => void handleVouch("Good")}
                type="button"
              >
                Vouch good
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              You do not have an active seed claim.
            </p>
            <Button
              disabled={isClaiming}
              onClick={() => void handleClaimSeed()}
              type="button"
            >
              {isClaiming ? "Claiming" : "Claim seed"}
            </Button>
          </div>
        )}

        {error && <FieldError>{error}</FieldError>}
      </section>
    </section>
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
