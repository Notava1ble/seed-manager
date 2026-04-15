import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash } from "lucide-react";
import { SEEDS } from "../../app/seeds";

const placeholder = () => undefined;

export function AdminSeedsPage() {
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
            {SEEDS.length === 1 ? "1 seed" : `${SEEDS.length} seeds`}
          </Badge>
          <Button type="button" onClick={placeholder}>
            <Plus data-icon="inline-start" />
            Add seed
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="border-r text-left">Seed Type</TableHead>
              <TableHead className="border-r">Overworld</TableHead>
              <TableHead className="border-r">Nether</TableHead>
              <TableHead className="border-r">End</TableHead>
              <TableHead className="border-r">RNG</TableHead>
              <TableHead className="border-r text-right">Score</TableHead>
              <TableHead className="border-r text-right">Comments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SEEDS.map((seed) => (
              <TableRow key={seed.id}>
                <TableCell className="border-r font-medium">
                  {seed.seedType}
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
                <TableCell className="border-r text-right tabular-nums">
                  {seed.upvotes - seed.downvotes}
                </TableCell>
                <TableCell className="border-r text-right tabular-nums">
                  {seed.comments}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      aria-label={`Edit ${seed.seedType}`}
                      onClick={placeholder}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      aria-label={`Delete ${seed.seedType}`}
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
    </section>
  );
}
