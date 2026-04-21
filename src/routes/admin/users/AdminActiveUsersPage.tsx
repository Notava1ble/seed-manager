import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { Outlet, useNavigate, useParams } from "react-router";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { UserRoleBadges } from "@/components/UserRoleBadges";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  getLeagueListLabel,
  getUserIdentifierLabel,
  getUserLabel,
} from "@/lib/userAccess";
import { cn, sortLeaguesByNumberAndName } from "@/lib/utils";
import { InviteUserDialog } from "./InviteUserDialog";

export function AdminActiveUsersPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const activeUsers = useQuery(api.users.listActiveUsers);
  const allLeagues = useQuery(api.leagues.listLeagues);
  const leagues = useMemo(
    () => sortLeaguesByNumberAndName(allLeagues ?? []),
    [allLeagues],
  );
  const isLoading = activeUsers === undefined || allLeagues === undefined;
  const isUserSheetOpen = Boolean(userId);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const closeInviteDialog = () => {
    setIsInviteDialogOpen(false);
  };

  const handleUserSheetOpenChange = (open: boolean) => {
    if (!open) {
      void navigate("/app/admin/users/active");
    }
  };

  const handleInviteSuccess = (activatedUserId: Id<"users">) => {
    setIsInviteDialogOpen(false);
    void navigate(`/app/admin/users/active/${activatedUserId}`);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <section className="flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-y-auto overscroll-contain pr-2 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="mt-2 text-2xl font-semibold">Active users</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Manage roles and league access for users who can enter the app.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {isLoading
                ? "Loading"
                : getActiveUserCountLabel(activeUsers.length)}
            </Badge>
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger render={<Button type="button" />}>
                <UserPlus data-icon="inline-start" />
                Invite user
              </DialogTrigger>
              {isInviteDialogOpen ? (
                <InviteUserDialog
                  leagues={leagues}
                  onClose={closeInviteDialog}
                  onSuccess={handleInviteSuccess}
                />
              ) : null}
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <AdminActiveUsersTableSkeleton />
        ) : activeUsers.length === 0 ? (
          <Empty className="min-h-72">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No active users</EmptyTitle>
              <EmptyDescription>
                Invite a signed-in user or activate someone from Pending Users.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <AdminActiveUsersTable
            activeUserId={userId as Id<"users"> | undefined}
            leagues={leagues}
            onUserSelect={(selectedUserId) =>
              void navigate(`/app/admin/users/active/${selectedUserId}`)
            }
            users={activeUsers}
          />
        )}
      </section>

      <Sheet open={isUserSheetOpen} onOpenChange={handleUserSheetOpenChange}>
        <SheetContent
          className="overflow-y-auto p-6 data-[side=right]:sm:max-w-xl"
          side="right"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Active user details</SheetTitle>
          </SheetHeader>
          <Outlet />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AdminActiveUsersTable({
  activeUserId,
  leagues,
  onUserSelect,
  users,
}: {
  activeUserId?: Id<"users">;
  leagues: Doc<"leagues">[];
  onUserSelect: (userId: Id<"users">) => void;
  users: Doc<"users">[];
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table containerClassName="max-h-[calc(100svh-12rem)]">
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">User</TableHead>
            <TableHead className="border-r">Email</TableHead>
            <TableHead className="border-r">Roles</TableHead>
            <TableHead className="border-r">Home leagues</TableHead>
            <TableHead className="border-r">Host leagues</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user._id}
              className={cn(
                "cursor-pointer",
                activeUserId === user._id && "bg-muted/50",
              )}
              onClick={() => onUserSelect(user._id)}
            >
              <TableCell className="border-r">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{getUserLabel(user)}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {getUserIdentifierLabel(user)}
                  </span>
                </div>
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {user.email ?? "No email"}
              </TableCell>
              <TableCell className="border-r">
                <UserRoleBadges roles={user.roles} />
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {getLeagueListLabel(leagues, user.homeLeagueId)}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {getLeagueListLabel(leagues, user.hostLeagueId)}
              </TableCell>
              <TableCell>
                {user.roles.includes("admin") ? (
                  <Badge variant="outline">
                    <ShieldCheck data-icon="inline-start" />
                    Read-only
                  </Badge>
                ) : (
                  <Badge variant="secondary">Manageable</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminActiveUsersTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border" aria-busy="true">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">User</TableHead>
            <TableHead className="border-r">Email</TableHead>
            <TableHead className="border-r">Roles</TableHead>
            <TableHead className="border-r">Home leagues</TableHead>
            <TableHead className="border-r">Host leagues</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="border-r">
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-40" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-24" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-28" />
              </TableCell>
              <TableCell className="border-r">
                <Skeleton className="h-5 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function getActiveUserCountLabel(userCount: number) {
  return userCount === 1 ? "1 active user" : `${userCount} active users`;
}
