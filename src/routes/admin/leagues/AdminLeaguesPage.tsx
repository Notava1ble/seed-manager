import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../../../convex/_generated/api";
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

export function AdminLeaguesPage() {
  const allLeagues = useQuery(api.leagues.listLeagues);
  const leagues = useMemo(
    () =>
      [...(allLeagues ?? [])].sort(
        (a, b) =>
          a.leagueNumber - b.leagueNumber ||
          a.leagueName.localeCompare(b.leagueName),
      ),
    [allLeagues],
  );
  const isLoading = allLeagues === undefined;
  const leagueCountLabel =
    leagues.length === 1 ? "1 league" : `${leagues.length} leagues`;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="mt-2 text-2xl font-semibold">Manage leagues</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            League groups for seed review.
          </p>
        </div>
        <Badge variant="outline">
          {isLoading ? "Loading" : leagueCountLabel}
        </Badge>
      </div>

      {isLoading ? <LeagueTableSkeleton /> : <LeagueTable leagues={leagues} />}
    </section>
  );
}

type League = NonNullable<
  ReturnType<typeof useQuery<typeof api.leagues.listLeagues>>
>[number];

function LeagueTable({ leagues }: { leagues: League[] }) {
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

function LeagueTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Number</TableHead>
            <TableHead>Name</TableHead>
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
                <Skeleton className="h-5 w-48" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
