import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
import { useMutation } from "convex/react";
import { Pencil, Trash, Trophy } from "lucide-react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { type Doc, type Id } from "../../convex/_generated/dataModel";
import { AlertDialog } from "./ui/alert-dialog";
import { DeleteAlert } from "./dialogs/DeleteDialog";
import { EditLeagueDialog } from "./dialogs/EditLeagueDialog";

export function LeagueTable({ leagues }: { leagues: Doc<"leagues">[] }) {
  const deleteLeague = useMutation(api.leagues.deleteLeague);
  const [isLoading, setIsLoading] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] =
    useState<Id<"leagues"> | null>(null);
  const [editingLeagueId, setEditingLeagueId] = useState<Id<"leagues"> | null>(
    null,
  );

  const selectedLeague = leagues.find(
    (league) => league._id === selectedLeagueId,
  );
  const editingLeague = leagues.find(
    (league) => league._id === editingLeagueId,
  );

  const shouldShowAlert =
    isAlertOpen && selectedLeagueId !== null && selectedLeague !== undefined;
  const shouldShowEditDialog =
    isEditDialogOpen && editingLeagueId !== null && editingLeague !== undefined;

  const deleteSelectedLeague = async () => {
    if (!selectedLeague) return;
    try {
      setIsLoading(true);
      await deleteLeague({ leagueId: selectedLeague._id });
    } catch (error) {
      console.error("Failed to delete league:", error);
    } finally {
      setIsLoading(false);
    }
    setSelectedLeagueId(null);
    setIsAlertOpen(false);
  };

  const toggleAlert = (open: boolean) => {
    if (!open) {
      setSelectedLeagueId(null);
      setIsAlertOpen(false);
    }
  };

  const closeEditDialog = () => {
    setEditingLeagueId(null);
    setIsEditDialogOpen(false);
  };

  const toggleEditDialog = (open: boolean) => {
    if (!open) {
      closeEditDialog();
      return;
    }

    setIsEditDialogOpen(true);
  };

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
    <div className="overflow-hidden rounded-md border">
      <AlertDialog open={shouldShowAlert} onOpenChange={toggleAlert}>
        <DeleteAlert
          isLoading={isLoading}
          label={`Delete ${selectedLeague?.leagueName}?`}
          onDelete={() => void deleteSelectedLeague()}
        />
      </AlertDialog>
      <Dialog open={shouldShowEditDialog} onOpenChange={toggleEditDialog}>
        {editingLeague ? (
          <EditLeagueDialog league={editingLeague} onClose={closeEditDialog} />
        ) : null}
      </Dialog>
      <Table containerClassName="max-h-[calc(100svh-15rem)]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-24 border-r">Number</TableHead>
            <TableHead className="border-r">Name</TableHead>
            <TableHead className="text-left border-r">Total seeds</TableHead>
            <TableHead className="text-left border-r">Used</TableHead>
            <TableHead className="text-left border-r">Unused</TableHead>
            <TableHead className="text-left border-r">League ID</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leagues.map((league) => (
            <TableRow key={league._id}>
              <TableCell className="border-r">
                <Badge variant="secondary">League {league.leagueNumber}</Badge>
              </TableCell>
              <TableCell className="font-medium border-r font-mono">
                {league.leagueName}
              </TableCell>
              <TableCell className="text-left tabular-nums border-r font-mono">
                {league.seedCount}
              </TableCell>
              <TableCell className="text-left tabular-nums border-r font-mono">
                {league.usedSeedCount}
              </TableCell>
              <TableCell className="text-left tabular-nums border-r font-mono">
                {league.seedCount - league.usedSeedCount}
              </TableCell>
              <TableCell className="truncate text-muted-foreground border-r font-mono">
                {league._id}
              </TableCell>
              <TableCell className="flex gap-1 justify-end font-mono">
                <Button
                  aria-label={`Edit ${league.leagueName}`}
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => {
                    setEditingLeagueId(league._id);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="destructive"
                  size="icon-sm"
                  aria-label={`Delete ${league.leagueName}`}
                  onClick={() => {
                    setSelectedLeagueId(league._id);
                    setIsAlertOpen(true);
                  }}
                >
                  <Trash />
                </Button>
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
