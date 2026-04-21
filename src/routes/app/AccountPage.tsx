import { useQuery } from "convex/react";
import { AlertCircleIcon } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserDetailValue } from "@/components/UserDetailValue";
import { UserRoleBadges } from "@/components/UserRoleBadges";
import { getUserIdentifierLabel, getUserLabel } from "@/lib/userAccess";

export function AccountPage() {
  const user = useQuery(api.users.currentUser);
  const leagues = useQuery(api.leagues.listLeagues);

  const homeLeagues =
    leagues
      ?.filter((l) => user?.homeLeagueId?.includes(l._id))
      .map((l) => l.leagueName)
      .join(", ") ?? "None";
  const hostLeagues =
    leagues
      ?.filter((l) => user?.homeLeagueId?.includes(l._id))
      .map((l) => l.leagueName)
      .join(", ") ?? "None";

  return (
    <div className="grid max-w-3xl gap-4">
      <Card>
        <CardContent>
          {user === undefined ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : user === null ? (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>Account unavailable</AlertTitle>
              <AlertDescription>
                Sign in again before changing account settings.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="lg">
                  {user.image && (
                    <AvatarImage alt={getUserLabel(user)} src={user.image} />
                  )}
                  <AvatarFallback>
                    {getUserInitials(getUserLabel(user))}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-sm font-medium">
                    {getUserLabel(user)}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {getUserIdentifierLabel(user)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <UserDetailValue
                  label="Email"
                  value={user.email ?? "No email"}
                />
                <UserDetailValue label="Status" value={user.status} />
                <UserDetailValue
                  label="Home Leagues"
                  value={homeLeagues.length !== 0 ? homeLeagues : "None"}
                />
                <UserDetailValue
                  label="Host Leagues"
                  value={hostLeagues.length !== 0 ? hostLeagues : "None"}
                />
                <UserDetailValue
                  className="sm:col-span-2"
                  label="Roles"
                  value={<UserRoleBadges roles={user.roles} />}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getUserInitials(displayName: string) {
  return displayName.trim().slice(0, 2).toUpperCase() || "U";
}
