import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { ShieldAlert, UserCog, Users } from "lucide-react";
import { useParams } from "react-router";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, sortLeaguesByNumberAndName } from "@/lib/utils";

type ManagedRole = "host" | "tester";
type UserRole = "admin" | ManagedRole;

const EMPTY_LEAGUE_VALUE = null;

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
  const [roles, setRoles] = useState<ManagedRole[]>(getManagedRoles(user));
  const [homeLeagueId, setHomeLeagueId] = useState<Id<"leagues"> | null>(
    user.homeLeagueId ?? null,
  );
  const [hostLeagueId, setHostLeagueId] = useState<Id<"leagues"> | null>(
    user.hostLeagueId ?? null,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setRole = (role: ManagedRole, checked: boolean) => {
    setRoles((currentRoles) => {
      if (checked) {
        return currentRoles.includes(role)
          ? currentRoles
          : [...currentRoles, role];
      }

      return currentRoles.filter((currentRole) => currentRole !== role);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await updateManagedUser({
        userId: user._id,
        roles,
        homeLeagueId: homeLeagueId ?? undefined,
        hostLeagueId: hostLeagueId ?? undefined,
      });
    } catch (error) {
      setFormError(getErrorMessage(error, "Could not update this user"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Roles</FieldLegend>
          <FieldDescription>
            Admin access is not editable here.
          </FieldDescription>
          <FieldGroup data-slot="checkbox-group">
            <Field orientation="horizontal">
              <Checkbox
                checked={roles.includes("tester")}
                disabled={isSubmitting}
                id="managed-role-tester"
                onCheckedChange={(checked) =>
                  setRole("tester", checked === true)
                }
              />
              <FieldContent>
                <FieldLabel htmlFor="managed-role-tester">Tester</FieldLabel>
                <FieldDescription>
                  Can claim and review unassigned seeds.
                </FieldDescription>
              </FieldContent>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                checked={roles.includes("host")}
                disabled={isSubmitting}
                id="managed-role-host"
                onCheckedChange={(checked) => setRole("host", checked === true)}
              />
              <FieldContent>
                <FieldLabel htmlFor="managed-role-host">Host</FieldLabel>
                <FieldDescription>
                  Can manage seeds in their host league.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </FieldSet>

        <Field>
          <FieldLabel htmlFor="managed-home-league">Home league</FieldLabel>
          <Select
            disabled={isSubmitting}
            itemToStringLabel={(leagueId) =>
              leagueId === null
                ? "No league"
                : (leagues.find((league) => league._id === leagueId)
                    ?.leagueName ?? "Unknown league")
            }
            onValueChange={(nextValue) => setHomeLeagueId(nextValue)}
            value={homeLeagueId}
          >
            <SelectTrigger id="managed-home-league" className="w-full">
              <SelectValue placeholder="No league" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Home league</SelectLabel>
                <SelectItem value={EMPTY_LEAGUE_VALUE}>No league</SelectItem>
                {leagues.map((league) => (
                  <SelectItem key={league._id} value={league._id}>
                    {league.leagueName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            A tester cannot see their home league through tester access.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="managed-host-league">Host league</FieldLabel>
          <Select
            disabled={isSubmitting}
            itemToStringLabel={(leagueId) =>
              leagueId === null
                ? "No league"
                : (leagues.find((league) => league._id === leagueId)
                    ?.leagueName ?? "Unknown league")
            }
            onValueChange={(nextValue) => setHostLeagueId(nextValue)}
            value={hostLeagueId}
          >
            <SelectTrigger id="managed-host-league" className="w-full">
              <SelectValue placeholder="No league" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Host league</SelectLabel>
                <SelectItem value={EMPTY_LEAGUE_VALUE}>No league</SelectItem>
                {leagues.map((league) => (
                  <SelectItem key={league._id} value={league._id}>
                    {league.leagueName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            A host can manage seeds only in their host league.
          </FieldDescription>
        </Field>
      </FieldGroup>

      <FieldError>{formError}</FieldError>

      <Button disabled={isSubmitting} type="submit">
        <UserCog data-icon="inline-start" />
        {isSubmitting ? "Saving..." : "Save changes"}
      </Button>
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
        label="Home league"
        value={getLeagueLabel(leagues, user.homeLeagueId)}
      />
      <UserDetailValue
        label="Host league"
        value={getLeagueLabel(leagues, user.hostLeagueId)}
      />
      <UserDetailValue
        className="col-span-2"
        label="Roles"
        value={<RoleBadges roles={user.roles} />}
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

function getManagedRoles(user: Doc<"users">): ManagedRole[] {
  return user.roles.filter(isManagedRole);
}

function isManagedRole(role: unknown): role is ManagedRole {
  return role === "host" || role === "tester";
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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ConvexError) {
    const data = error.data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
