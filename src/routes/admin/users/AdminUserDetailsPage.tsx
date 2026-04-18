import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ShieldAlert, UserCog, Users } from "lucide-react";
import { useParams } from "react-router";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { LeagueAccessMultiSelect } from "@/components/LeagueAccessMultiSelect";
import { ManagedRoleFields } from "@/components/ManagedRoleFields";
import { UserRoleBadges } from "@/components/UserRoleBadges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  getLeagueListLabel,
  getManagedUserValues,
  getUserLabel,
  haveSameLeagueIds,
  haveSameManagedRoles,
  type ManagedRole,
} from "@/lib/userAccess";
import { cn, sortLeaguesByNumberAndName } from "@/lib/utils";

export function AdminUserDetailsPage() {
  const { userId } = useParams();
  const activeUsers = useQuery(api.users.listActiveUsers);
  const allLeagues = useQuery(api.leagues.listLeagues);
  const leagues = useMemo(
    () => sortLeaguesByNumberAndName(allLeagues ?? []),
    [allLeagues],
  );
  const selectedUserId = userId as Id<"users"> | undefined;
  const user = activeUsers?.find(
    (activeUser) => activeUser._id === selectedUserId,
  );

  if (activeUsers === undefined || allLeagues === undefined) {
    return <UserDetailsSkeleton />;
  }

  if (!user) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>User not found</EmptyTitle>
          <EmptyDescription>
            This user is not in the active user list.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const isAdmin = user.roles.includes("admin");

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{getUserLabel(user)}</h2>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {user.lowercaseName ? `@${user.lowercaseName}` : user._id}
        </p>
      </div>

      <Separator />

      <UserIdentitySummary leagues={leagues} user={user} />

      {isAdmin ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Admin user is read-only</AlertTitle>
          <AlertDescription>
            Admin accounts are managed through the database dashbaord.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Separator />
          <ManagedUserForm key={user._id} leagues={leagues} user={user} />
        </>
      )}
    </div>
  );
}

function ManagedUserForm({
  leagues,
  user,
}: {
  leagues: Doc<"leagues">[];
  user: Doc<"users">;
}) {
  const updateManagedUser = useMutation(api.users.updateManagedUser);
  const savedValues = useMemo(() => getManagedUserValues(user), [user]);
  const [roles, setRoles] = useState<ManagedRole[]>(savedValues.roles);
  const [homeLeagueId, setHomeLeagueId] = useState<Id<"leagues">[]>(
    savedValues.homeLeagueId,
  );
  const [hostLeagueId, setHostLeagueId] = useState<Id<"leagues">[]>(
    savedValues.hostLeagueId,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasChanges =
    !haveSameManagedRoles(roles, savedValues.roles) ||
    !haveSameLeagueIds(homeLeagueId, savedValues.homeLeagueId) ||
    !haveSameLeagueIds(hostLeagueId, savedValues.hostLeagueId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasChanges || isSubmitting) {
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await updateManagedUser({
        userId: user._id,
        roles,
        homeLeagueId,
        hostLeagueId,
      });
    } catch (error) {
      setFormError(getErrorMessage(error, "Could not update this user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetChanges = () => {
    setFormError(null);
    setRoles(savedValues.roles);
    setHomeLeagueId(savedValues.homeLeagueId);
    setHostLeagueId(savedValues.hostLeagueId);
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <FieldGroup>
        <ManagedRoleFields
          description="Admin access is not editable here."
          disabled={isSubmitting}
          idPrefix="managed"
          onRolesChange={setRoles}
          roles={roles}
        />

        <LeagueAccessMultiSelect
          description="A tester cannot see their home leagues through tester access."
          disabled={isSubmitting}
          id="managed-home-league"
          label="Home leagues"
          leagues={leagues}
          onValueChange={setHomeLeagueId}
          value={homeLeagueId}
        />

        <LeagueAccessMultiSelect
          description="A host can manage seeds only in their host leagues."
          disabled={isSubmitting}
          id="managed-host-league"
          label="Host leagues"
          leagues={leagues}
          onValueChange={setHostLeagueId}
          value={hostLeagueId}
        />
      </FieldGroup>

      <FieldError>{formError}</FieldError>

      <div className="flex flex-wrap gap-2">
        <Button disabled={isSubmitting || !hasChanges} type="submit">
          <UserCog data-icon="inline-start" />
          {isSubmitting ? "Saving..." : "Save changes"}
        </Button>
        <Button
          disabled={isSubmitting || !hasChanges}
          onClick={resetChanges}
          type="button"
          variant="outline"
        >
          Reset changes
        </Button>
      </div>
    </form>
  );
}

function UserIdentitySummary({
  leagues,
  user,
}: {
  leagues: Doc<"leagues">[];
  user: Doc<"users">;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <UserDetailValue label="Email" value={user.email ?? "No email"} />
      <UserDetailValue label="Status" value={user.status} />
      <UserDetailValue
        label="Home leagues"
        value={getLeagueListLabel(leagues, user.homeLeagueId)}
      />
      <UserDetailValue
        label="Host leagues"
        value={getLeagueListLabel(leagues, user.hostLeagueId)}
      />
      <UserDetailValue
        className="col-span-2"
        label="Roles"
        value={<UserRoleBadges roles={user.roles} />}
      />
    </div>
  );
}

function UserDetailValue({
  label,
  className,
  value,
}: {
  label: string;
  className?: string;
  value: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="min-h-5 truncate text-xs font-medium">{value}</div>
    </div>
  );
}

function UserDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-52" />
      <Separator />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-36 w-full" />
    </div>
  );
}
