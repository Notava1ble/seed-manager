import { useState } from "react";
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
import { Pencil, Plus, Sprout, Trash } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import AddSeedDialog from "@/components/dialogs/AddSeedDialog";
import { getSeedCountLabel } from "@/lib/utils";
import { SEED_TYPES } from "@/lib/consts";

const placeholder = () => undefined;

export function AdminSeedsPage() {
  const seeds = useQuery(api.seeds.listAllSeeds);
  const leagues = useQuery(api.leagues.listLeagues);

  const isLoading = leagues === undefined || seeds === undefined;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const closeAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="mt-2 text-2xl font-semibold">Manage seeds</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Seed records for review and league assignment.
          </p>
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
      ) : seeds.length === 0 ? (
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
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="border-r text-left">Seed Type</TableHead>
                <TableHead className="border-r">Overworld</TableHead>
                <TableHead className="border-r">Nether</TableHead>
                <TableHead className="border-r">End</TableHead>
                <TableHead className="border-r">RNG</TableHead>
                <TableHead className="border-r">League</TableHead>
                <TableHead className="border-r">Status</TableHead>
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
                  <TableCell className="max-w-48 truncate border-r font-mono text-muted-foreground">
                    {seed.overworld}
                  </TableCell>
                  <TableCell className="max-w-48 truncate border-r font-mono text-muted-foreground">
                    {seed.nether}
                  </TableCell>
                  <TableCell className="max-w-48 truncate border-r font-mono text-muted-foreground">
                    {seed.end}
                  </TableCell>
                  <TableCell className="max-w-48 truncate border-r font-mono text-muted-foreground">
                    {seed.rng}
                  </TableCell>
                  <TableCell className="max-w-48 truncate border-r font-mono text-muted-foreground">
                    {leagues?.find((l) => l._id === seed.leagueId)
                      ?.leagueName ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="border-r">
                    <SeedStatusBadge
                      isUsed={seed.isUsed}
                      leagueId={seed.leagueId}
                      claimedBy={seed.claimedBy}
                      rating={seed.rating}
                    />
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
      )}
    </section>
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
            <TableHead className="border-r">Status</TableHead>
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
                <Skeleton className="ml-auto h-5 w-8" />
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

function SeedStatusBadge({
  isUsed,
  leagueId,
  claimedBy,
  rating,
}: {
  isUsed: boolean;
  leagueId?: string;
  claimedBy?: string;
  rating?: "Good" | "Bad";
}) {
  if (isUsed) {
    return <Badge variant="outline">Used</Badge>;
  }

  if (leagueId) {
    return <Badge variant="secondary">Assigned</Badge>;
  }

  if (rating === "Bad") {
    return <Badge variant="destructive">Rejected</Badge>;
  }

  if (claimedBy) {
    return <Badge variant="outline">Claimed</Badge>;
  }

  return <Badge variant="outline">Unassigned</Badge>;
}

function SeedRatingBadge({ rating }: { rating?: "Good" | "Bad" }) {
  if (!rating) {
    return <Badge variant="outline">Unrated</Badge>;
  }

  return (
    <Badge variant={rating === "Good" ? "secondary" : "destructive"}>
      {rating}
    </Badge>
  );
}
