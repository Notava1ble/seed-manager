import { useQuery } from "convex/react";
import { Sprout } from "lucide-react";
import { useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SeedVoting } from "@/components/SeedFeedbackActions";
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

export function SeedPage() {
  const { leagueId, seedId } = useParams();
  const selectedLeagueId = leagueId as Id<"leagues"> | undefined;
  const selectedSeedId = seedId as Id<"seeds"> | undefined;
  const seed = useQuery(
    api.seeds.getSeedForLeague,
    selectedLeagueId && selectedSeedId ? { seedId: selectedSeedId } : "skip",
  );

  if (seed === undefined) {
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
        <h2 className="text-2xl font-semibold">
          {seed.type ? SEED_TYPES[seed.type] : "Unspecified seed"}
        </h2>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-2">
        <SeedDetailValue label="Overworld" value={seed.overworld} />
        <SeedDetailValue label="Nether" value={seed.nether} />
        <SeedDetailValue label="End" value={seed.end} />
        <SeedDetailValue label="RNG" value={seed.rng} />
      </div>

      <div className="pt-2">
        <SeedVoting
          comments={seed.commentCount}
          downvotes={seed.downvoteCount}
          upvotes={seed.upvoteCount}
        />
      </div>
      {/* TODO: Comments section */}
    </div>
  );
}

function SeedDetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-mono text-xs">{value}</p>
    </div>
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
