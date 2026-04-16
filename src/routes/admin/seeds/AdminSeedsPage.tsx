import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import AddSeedDialog from "@/components/dialogs/AddSeedDialog";
import { LeagueTableSkeleton } from "@/components/LeagueTable";
import { getSeedCountLabel } from "@/lib/utils";

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

      {!isLoading ? (
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
                <TableHead className="border-r text-right">Score</TableHead>
                <TableHead className="border-r text-right">Comments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seeds.map((seed) => (
                <TableRow key={seed._id}>
                  <TableCell className="border-r font-medium">
                    {seed.type}
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
                      ?.leagueName ?? "Unspecified"}
                  </TableCell>
                  <TableCell className="border-r text-right tabular-nums">
                    {seed.upvoteCount - seed.downvoteCount}
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
      ) : (
        <LeagueTableSkeleton />
      )}
    </section>
  );
}
