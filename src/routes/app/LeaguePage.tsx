import { useQuery } from "convex/react";
import { MessageCircle, ShieldCheck, Sprout, TimerReset } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate, useParams } from "react-router";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { SeedRatingBadge } from "@/components/SeedRatingBadge";
import { SeedStatusBadge } from "@/components/SeedStatusBadge";
import { SeedValueTableCell } from "@/components/SeedValueTableCell";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { SEED_TYPES } from "@/lib/consts";
import { cn } from "@/lib/utils";

export function LeaguePage() {
  const { leagueId } = useParams();
  const navigate = useNavigate();
  const [showAllAssigned, setShowAllAssigned] = useState(false);
  const selectedLeagueId = leagueId as Id<"leagues"> | undefined;
  const seeds = useQuery(
    api.seeds.listSeedsByLeague,
    selectedLeagueId ? { leagueId: selectedLeagueId, showAllAssigned } : "skip",
  );

  return (
    <div className="flex h-full min-h-0 gap-6">
      <section className="flex min-h-0 flex-9 flex-col gap-4">
        <Field orientation="horizontal" className="items-center justify-end">
          <Switch
            checked={showAllAssigned}
            id="show-all-assigned-seeds"
            onCheckedChange={setShowAllAssigned}
          />
          <FieldContent>
            <FieldLabel htmlFor="show-all-assigned-seeds">
              Show all assigned seeds
            </FieldLabel>
            <FieldDescription>
              Include used seeds and seeds currently marked bad.
            </FieldDescription>
          </FieldContent>
        </Field>

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
      <aside className="min-w-0 flex-3 p-2">
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
            <TableHead className="w-20 border-r text-center">
              <TimerReset />
            </TableHead>
            <TableHead className="w-20 border-r text-center">
              <ShieldCheck />
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
                <SeedValueTableCell value={seed.overworld} />
                <SeedValueTableCell value={seed.nether} />
                <SeedValueTableCell value={seed.end} />
                <SeedValueTableCell value={seed.rng} />
                <TableCell className="border-r text-center">
                  <SeedStatusBadge status={seed.isUsed ? "used" : "open"} />
                </TableCell>
                <TableCell className="border-r text-center">
                  <SeedRatingBadge rating={seed.rating} />
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

function SeedTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-48" />
      <div className="overflow-hidden rounded-md border">
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
