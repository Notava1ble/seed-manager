import { Badge } from "@/components/ui/badge";
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
import { Trophy } from "lucide-react";
import { Doc } from "../../convex/_generated/dataModel";

export function LeagueTable({ leagues }: { leagues: Doc<"leagues">[] }) {
  if (leagues.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No leagues yet</EmptyTitle>
          <EmptyDescription>
            Add leagues before importing seeds.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Number</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Total seeds</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead className="text-right">Unused</TableHead>
            <TableHead className="w-56">League ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leagues.map((league) => (
            <TableRow key={league._id}>
              <TableCell>
                <Badge variant="secondary">League {league.leagueNumber}</Badge>
              </TableCell>
              <TableCell className="font-medium">{league.leagueName}</TableCell>
              <TableCell className="text-right tabular-nums">
                {league.seedCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {league.usedSeedCount}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {league.seedCount - league.usedSeedCount}
              </TableCell>
              <TableCell className="max-w-56 truncate font-mono text-muted-foreground">
                {league._id}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LeagueTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Number</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Total seeds</TableHead>
            <TableHead className="text-right">Used</TableHead>
            <TableHead className="text-right">Unused</TableHead>
            <TableHead className="w-56">League ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 4 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-32" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-5 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-5 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="ml-auto h-5 w-8" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-48" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
