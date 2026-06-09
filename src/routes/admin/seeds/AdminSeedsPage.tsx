import { useMemo, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SeedRatingBadge } from "@/components/SeedRatingBadge";
import { SeedValueTableCell } from "@/components/SeedValueTableCell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Plus, RotateCcw, Sprout, Trash } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import AddSeedDialog from "@/components/dialogs/AddSeedDialog";
import { getSeedCountLabel } from "@/lib/utils";
import { SEED_TYPES, seedTypesArray } from "@/lib/consts";

const placeholder = () => undefined;

export function AdminSeedsPage() {
  const seeds = useQuery(api.seeds.listAllSeeds);
  const badSeeds = useQuery(api.seeds.listBadSeeds);
  const leagues = useQuery(api.leagues.listLeagues);
  const recycleBadSeed = useMutation(api.seeds.recycleBadSeed);

  const isLoading =
    leagues === undefined || seeds === undefined || badSeeds === undefined;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("active");
  const [recyclingSeedId, setRecyclingSeedId] = useState<Id<"seeds"> | null>(
    null,
  );
  const [pendingRecycleSeedId, setPendingRecycleSeedId] =
    useState<Id<"seeds"> | null>(null);
  const [recycleError, setRecycleError] = useState<string | null>(null);

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  const seedStats = useMemo(() => {
    const availableByType = Object.fromEntries(
      seedTypesArray.map((seedType) => [seedType, 0]),
    ) as Record<keyof typeof SEED_TYPES, number>;

    let assignedCount = 0;
    let claimedCount = 0;

    for (const seed of seeds ?? []) {
      if (seed.leagueId !== undefined) {
        assignedCount += 1;
      }

      if (seed.claimedBy !== undefined && seed.rating === undefined) {
        claimedCount += 1;
      }

      if (
        seed.type &&
        seed.leagueId === undefined &&
        seed.claimedBy === undefined &&
        seed.rating === undefined
      ) {
        availableByType[seed.type] += 1;
      }
    }

    return {
      assignedCount,
      availableByType,
      claimedCount,
    };
  }, [seeds]);

  const handleRecycleSeed = async () => {
    if (!recyclingSeedId) return;

    const seedId = recyclingSeedId;
    setPendingRecycleSeedId(seedId);
    setRecycleError(null);

    try {
      await recycleBadSeed({ seedId });
      setRecyclingSeedId(null);
    } catch (error) {
      setRecycleError(
        error instanceof Error ? error.message : "Could not recycle this seed",
      );
    } finally {
      setPendingRecycleSeedId(null);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="mt-2 text-2xl font-semibold">Manage seeds</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {isLoading ? "Loading" : getSeedCountLabel(seeds.length)}
          </Badge>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger render={<Button type="button" />}>
              <Plus data-icon="inline-start" />
              Add seed
            </DialogTrigger>
            {isAddDialogOpen && (
              <AddSeedDialog onClose={closeAddDialog} leagues={leagues || []} />
            )}
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <AdminSeedTableSkeleton />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="active">Current seeds</TabsTrigger>
              <TabsTrigger value="bad">Bad seeds</TabsTrigger>
            </TabsList>
            {activeTab === "active" ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                {seedTypesArray.map((seedType) => (
                  <div
                    key={seedType}
                    className="flex min-h-9 min-w-24 items-center justify-between gap-3 rounded-md border bg-card px-3 py-1.5"
                  >
                    <span className="truncate text-xs text-muted-foreground">
                      {SEED_TYPES[seedType]}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {seedStats.availableByType[seedType]}
                    </span>
                  </div>
                ))}
                <div className="flex min-h-9 items-center gap-3 rounded-md border bg-muted/30 px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">
                    Claimed
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {seedStats.claimedCount}
                  </span>
                </div>
                <div className="flex min-h-9 items-center gap-3 rounded-md border bg-muted/30 px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">
                    Assigned
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {seedStats.assignedCount}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex min-h-9 items-center gap-3 rounded-md border bg-card px-3 py-1.5">
                <span className="text-xs text-muted-foreground">
                  Bad seeds total
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {badSeeds.length}
                </span>
              </div>
            )}
          </div>
          <TabsContent value="active">
            {seeds.length === 0 ? (
              <AdminSeedsEmptyState />
            ) : (
              <AdminActiveSeedTable seeds={seeds} leagues={leagues} />
            )}
          </TabsContent>
          <TabsContent value="bad">
            {badSeeds.length === 0 ? (
              <AdminBadSeedsEmptyState />
            ) : (
              <AdminBadSeedTable
                pendingRecycleSeedId={pendingRecycleSeedId}
                seeds={badSeeds}
                onRecycle={setRecyclingSeedId}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog
        open={recyclingSeedId !== null}
        onOpenChange={(open) => {
          if (!open && pendingRecycleSeedId === null) {
            setRecyclingSeedId(null);
            setRecycleError(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-lg sm:max-w-lg">
          <AlertDialogTitle>Recycle this bad seed?</AlertDialogTitle>
          <AlertDialogDescription>
            This action resets the rating of a seed, putting it back to the
            untested seed bank and making it available for claiming. BE CAREFUL:
            This can make it so this seed gets assigned to the league of the
            tester who originally marked it as Bad. Ensure that this seed is not
            recent to prevent them from remembering the details in case they get
            to play it in the leagues. (Is rare, but possible.)
          </AlertDialogDescription>
          {recycleError && (
            <p className="text-xs text-destructive">{recycleError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingRecycleSeedId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingRecycleSeedId !== null}
              onClick={() => void handleRecycleSeed()}
              variant="destructive"
            >
              {pendingRecycleSeedId ? "Recycling" : "Recycle seed"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function AdminActiveSeedTable({
  seeds,
  leagues,
}: {
  seeds: NonNullable<
    ReturnType<typeof useQuery<typeof api.seeds.listAllSeeds>>
  >;
  leagues: NonNullable<
    ReturnType<typeof useQuery<typeof api.leagues.listLeagues>>
  >;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table containerClassName="max-h-[calc(100svh-14rem)]">
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">Seed Type</TableHead>
            <TableHead className="border-r">Overworld</TableHead>
            <TableHead className="border-r">Nether</TableHead>
            <TableHead className="border-r">End</TableHead>
            <TableHead className="border-r">RNG</TableHead>
            <TableHead className="border-r">League</TableHead>
            <TableHead className="border-r">Week</TableHead>
            <TableHead className="border-r">Rating</TableHead>
            <TableHead className="border-r text-right">Comments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seeds.map((seed) => (
            <TableRow key={seed._id}>
              <TableCell className="border-r font-medium">
                {seed.type ? SEED_TYPES[seed.type] : "Unspecified"}
              </TableCell>
              <SeedValueTableCell value={seed.overworld} />
              <SeedValueTableCell value={seed.nether} />
              <SeedValueTableCell value={seed.end} />
              <SeedValueTableCell value={seed.rng} />
              <TableCell className="max-w-48 truncate border-r font-mono text-muted-foreground">
                {leagues.find((l) => l._id === seed.leagueId)?.leagueName ??
                  "Unassigned"}
              </TableCell>
              <TableCell className="border-r text-right tabular-nums">
                {seed.assignedWeekNumber ?? "None"}
              </TableCell>
              <TableCell className="border-r">
                <SeedRatingBadge rating={seed.rating} />
              </TableCell>
              <TableCell className="border-r text-right tabular-nums">
                {seed.commentCount}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Button
                    aria-label={`Edit ${seed.type}`}
                    onClick={placeholder}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    aria-label={`Delete ${seed.type}`}
                    onClick={placeholder}
                    size="icon-sm"
                    type="button"
                    variant="destructive"
                  >
                    <Trash />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminBadSeedTable({
  pendingRecycleSeedId,
  seeds,
  onRecycle,
}: {
  pendingRecycleSeedId: Id<"seeds"> | null;
  seeds: NonNullable<
    ReturnType<typeof useQuery<typeof api.seeds.listBadSeeds>>
  >;
  onRecycle: (seedId: Id<"seeds">) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table containerClassName="max-h-[calc(100svh-14rem)]">
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">Seed Type</TableHead>
            <TableHead className="border-r">Overworld</TableHead>
            <TableHead className="border-r">Nether</TableHead>
            <TableHead className="border-r">End</TableHead>
            <TableHead className="border-r">RNG</TableHead>
            <TableHead className="border-r">Created At</TableHead>
            <TableHead className="border-r">Voted At</TableHead>
            <TableHead className="border-r">Voted By</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {seeds.map((seed) => (
            <TableRow key={seed._id}>
              <TableCell className="border-r font-medium">
                {seed.type ? SEED_TYPES[seed.type] : "Unspecified"}
              </TableCell>
              <SeedValueTableCell value={seed.overworld} />
              <SeedValueTableCell value={seed.nether} />
              <SeedValueTableCell value={seed.end} />
              <SeedValueTableCell value={seed.rng} />
              <TableCell className="border-r whitespace-nowrap tabular-nums">
                {formatSeedDate(seed._creationTime)}
              </TableCell>
              <TableCell className="border-r whitespace-nowrap tabular-nums">
                {formatSeedDate(seed.votedAt)}
              </TableCell>
              <TableCell className="max-w-48 truncate border-r">
                {seed.votedByUser?.name ??
                  seed.votedByUser?.discordId ??
                  "Unknown"}
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <Button
                    aria-label={`Recycle ${seed.type}`}
                    disabled={pendingRecycleSeedId === seed._id}
                    onClick={() => onRecycle(seed._id)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <RotateCcw />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminSeedsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Sprout />
        </EmptyMedia>
        <EmptyTitle>No seeds yet</EmptyTitle>
        <EmptyDescription>
          Add seeds to start review and league assignment.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function AdminBadSeedsEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Sprout />
        </EmptyMedia>
        <EmptyTitle>No bad seeds</EmptyTitle>
        <EmptyDescription>
          Bad seed decisions will appear here for admin review.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function AdminSeedTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border" aria-busy="true">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">Seed Type</TableHead>
            <TableHead className="border-r">Overworld</TableHead>
            <TableHead className="border-r">Nether</TableHead>
            <TableHead className="border-r">End</TableHead>
            <TableHead className="border-r">RNG</TableHead>
            <TableHead className="border-r">League</TableHead>
            <TableHead className="border-r">Week</TableHead>
            <TableHead className="border-r">Rating</TableHead>
            <TableHead className="border-r text-right">Comments</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="ml-auto h-5 w-10" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="ml-auto h-5 w-8" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <Skeleton className="size-7" />
                  <Skeleton className="size-7" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatSeedDate(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
