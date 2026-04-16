import { useQuery } from "convex/react";
import { ArrowUp, MessageCircle, Sprout } from "lucide-react";
import { Outlet, useNavigate, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SEED_TYPES } from "@/lib/consts";
import { cn } from "@/lib/utils";

export function LeaguePage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const selectedLeagueId = leagueId as Id<"leagues"> | undefined;
  const seeds = useQuery(
    api.seeds.listSeedsByLeague,
    selectedLeagueId ? { leagueId: selectedLeagueId } : "skip",
  );

  return (
    <div className="flex h-full min-h-0 gap-6">
      <section className="flex min-h-0 flex-1 flex-col gap-4">
        {seeds === undefined ? (
          <SeedTableSkeleton />
        ) : (
          <SeedTable
            seeds={seeds}
            onSeedSelect={(selectedId) =>
              void navigate(`/app/league/${leagueId}/seed/${selectedId}`)
            }
          />
        )}
      </section>

      <Separator orientation="vertical" />
      <aside className="min-w-0 flex-1 p-2">
        <Outlet />
      </aside>
    </div>
  );
}

function SeedTable({
  seeds,
  onSeedSelect,
}: {
  seeds: Doc<"seeds">[];
  onSeedSelect: (seedId: Id<"seeds">) => void;
}) {
  const { seedId } = useParams();

  if (seeds.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sprout />
          </EmptyMedia>
          <EmptyTitle>No seeds in this league</EmptyTitle>
          <EmptyDescription>
            Imported seeds assigned to this league will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">Seed Type</TableHead>
            <TableHead className="border-r">Overworld</TableHead>
            <TableHead className="border-r">Nether</TableHead>
            <TableHead className="border-r">End</TableHead>
            <TableHead className="border-r">RNG</TableHead>
            <TableHead className="w-12 border-r text-center">
              <ArrowUp />
            </TableHead>
            <TableHead className="w-12 text-center">
              <MessageCircle />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seeds.map((seed) => {
            const isSelected = seed._id === seedId;

            return (
              <TableRow
                key={seed._id}
                className={cn("cursor-pointer", isSelected && "bg-muted")}
                onClick={() => onSeedSelect(seed._id)}
              >
                <TableCell className="border-r text-left font-medium">
                  {seed.type ? SEED_TYPES[seed.type] : "Unspecified"}
                </TableCell>
                <SeedValueCell value={seed.overworld} />
                <SeedValueCell value={seed.nether} />
                <SeedValueCell value={seed.end} />
                <SeedValueCell value={seed.rng} />
                <TableCell className="border-r text-center tabular-nums">
                  {seed.upvoteCount - seed.downvoteCount}
                </TableCell>
                <TableCell className="text-center tabular-nums">
                  {seed.commentCount}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SeedValueCell({ value }: { value: string }) {
  return (
    <TableCell className="max-w-40 truncate border-r font-mono text-muted-foreground">
      {value}
    </TableCell>
  );
}

function SeedTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-48" />
      <div className="overflow-hidden rounded-md border">
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
