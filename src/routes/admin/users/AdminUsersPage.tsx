import { type FormEvent, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { Outlet, useNavigate, useParams } from "react-router";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { cn, sortLeaguesByNumberAndName } from "@/lib/utils";
import { InviteUserDialog } from "./InviteUserDialog";

type UserRole = "admin" | "host" | "tester";

export function AdminUsersPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const activeUsers = useQuery(api.users.listActiveUsers);
  const allLeagues = useQuery(api.leagues.listLeagues);
  const leagues = useMemo(
    () => sortLeaguesByNumberAndName(allLeagues ?? []),
    [allLeagues],
  );
  const isLoading = activeUsers === undefined || allLeagues === undefined;
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const openInviteDialog = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (inviteUsername.trim().length === 0) {
      setInviteError("Enter a GitHub username");
      return;
    }

    setInviteError(null);
    setIsInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setIsInviteDialogOpen(false);
  };

  const handleInviteSuccess = (activatedUserId: Id<"users">) => {
    setInviteUsername("");
    setInviteError(null);
    setIsInviteDialogOpen(false);
    void navigate(`/app/admin/users/${activatedUserId}`);
  };

  return (
    <div className="flex h-full min-h-0 gap-6">
      <section className="flex min-h-0 flex-9 flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="mt-2 text-2xl font-semibold">Manage users</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Activate signed-in users and manage their roles and league access.
            </p>
          </div>
          <Badge variant="outline">
            {isLoading ? "Loading" : getUserCountLabel(activeUsers.length)}
          </Badge>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <form
            className="flex flex-col gap-2 sm:max-w-xl"
            onSubmit={openInviteDialog}
          >
            <FieldGroup>
              <Field data-invalid={Boolean(inviteError)}>
                <FieldLabel htmlFor="invite-github-username">
                  Invite by GitHub username
                </FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="invite-github-username"
                    aria-invalid={Boolean(inviteError)}
                    autoComplete="off"
                    onChange={(event) => {
                      setInviteUsername(event.currentTarget.value);
                      setInviteError(null);
                    }}
                    placeholder="github-user"
                    value={inviteUsername}
                  />
                  <Button type="submit">
                    <UserPlus data-icon="inline-start" />
                    Invite user
                  </Button>
                </div>
                <FieldDescription>
                  The user must have signed in once before they can be
                  activated.
                </FieldDescription>
                <FieldError>{inviteError}</FieldError>
              </Field>
            </FieldGroup>
          </form>

          {isInviteDialogOpen ? (
            <InviteUserDialog
              leagues={leagues}
              onClose={closeInviteDialog}
              onSuccess={handleInviteSuccess}
              username={inviteUsername.trim()}
            />
          ) : null}
        </Dialog>

        {isLoading ? (
          <AdminUsersTableSkeleton />
        ) : activeUsers.length === 0 ? (
          <Empty className="min-h-72">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No active users</EmptyTitle>
              <EmptyDescription>
                Invite a signed-in user to activate their account.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <AdminUsersTable
            activeUserId={userId as Id<"users"> | undefined}
            leagues={leagues}
            onUserSelect={(selectedUserId) =>
              void navigate(`/app/admin/users/${selectedUserId}`)
            }
            users={activeUsers}
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

function AdminUsersTable({
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">User</TableHead>
            <TableHead className="border-r">Email</TableHead>
            <TableHead className="border-r">Roles</TableHead>
            <TableHead className="border-r">Home league</TableHead>
            <TableHead className="border-r">Host league</TableHead>
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
                    {user.lowercaseName ? `@${user.lowercaseName}` : user._id}
                  </span>
                </div>
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {user.email ?? "No email"}
              </TableCell>
              <TableCell className="border-r">
                <RoleBadges roles={user.roles} />
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {getLeagueLabel(leagues, user.homeLeagueId)}
              </TableCell>
              <TableCell className="border-r text-muted-foreground">
                {getLeagueLabel(leagues, user.hostLeagueId)}
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

function RoleBadges({ roles }: { roles: UserRole[] }) {
  if (roles.length === 0) {
    return <Badge variant="outline">No roles</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <Badge
          key={role}
          variant={role === "admin" ? "destructive" : "secondary"}
        >
          {role}
        </Badge>
      ))}
    </div>
  );
}

function AdminUsersTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border" aria-busy="true">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="border-r text-left">User</TableHead>
            <TableHead className="border-r">Email</TableHead>
            <TableHead className="border-r">Roles</TableHead>
            <TableHead className="border-r">Home league</TableHead>
            <TableHead className="border-r">Host league</TableHead>
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

function getLeagueLabel(
  leagues: Doc<"leagues">[],
  leagueId: Id<"leagues"> | undefined,
) {
  if (!leagueId) {
    return "No league";
  }

  return (
    leagues.find((league) => league._id === leagueId)?.leagueName ??
    "Unknown league"
  );
}

function getUserLabel(user: Doc<"users">) {
  return user.name ?? user.lowercaseName ?? user.email ?? "Unnamed user";
}

function getUserCountLabel(userCount: number) {
  return userCount === 1 ? "1 active user" : `${userCount} active users`;
}
