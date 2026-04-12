import { Outlet, useNavigate, useParams } from "react-router";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, MessageCircle } from "lucide-react";
import { SEEDS, type Seed } from "./seeds";
import { cn } from "@/lib/utils";

export function LeaguePage() {
  const { leagueId } = useParams();
  const navigator = useNavigate();

  return (
    <div className="flex gap-6 h-full">
      <section className="flex flex-col gap-4 flex-1 h-full">
        <SeedTable
          seeds={SEEDS}
          onSeedSelect={(selectedId) =>
            void navigator(`/app/league/${leagueId}/seed/${selectedId}`)
          }
        />
      </section>

      <Separator orientation="vertical" />
      <aside className="p-2 flex-1">
        <Outlet />
      </aside>
    </div>
  );
}

function SeedTable({
  seeds,
  onSeedSelect,
}: {
  seeds: Seed[];
  onSeedSelect: (seedId: number) => void;
}) {
  const { seedId } = useParams();
  const selectedSeed = SEEDS.find((s) => s.id === Number(seedId));
  return (
    <Table className="">
      <TableCaption>All seeds assigned for this league</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="text-left">Seed Type</TableHead>
          <TableHead>Overworld</TableHead>
          <TableHead>Nether</TableHead>
          <TableHead>End</TableHead>
          <TableHead>RNG</TableHead>
          <TableHead className="text-center w-2">
            <ArrowUp />
          </TableHead>
          {/* <TableHead className="text-center w-2">
            <ArrowDown />
          </TableHead>  */}
          <TableHead className="text-center w-2">
            <MessageCircle />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {seeds.map((seed) => {
          const isSelected = seed.id === selectedSeed?.id;
          return (
            <TableRow
              key={seed.id}
              onClick={() => onSeedSelect(seed.id)}
              className={cn("cursor-pointer", isSelected && "bg-muted")}
            >
              <TableCell className="text-left">{seed.seedType}</TableCell>
              <TableCell>{seed.overworld}</TableCell>
              <TableCell>{seed.nether}</TableCell>
              <TableCell>{seed.end}</TableCell>
              <TableCell>{seed.rng}</TableCell>
              <TableCell className="text-center w-4">
                {seed.upvotes - seed.downvotes}
              </TableCell>
              {/* <TableCell className="text-center w-4">
                {seed.downvotes}
              </TableCell> */}
              <TableCell className="text-center w-4">{seed.comments}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
