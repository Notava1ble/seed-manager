import type { ReactNode } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { UserRoleBadges } from "@/components/UserRoleBadges";
import { getLeagueListLabel } from "@/lib/userAccess";
import { cn } from "@/lib/utils";

export function UserIdentitySummary({
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
        className="sm:col-span-2"
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
      <div className="min-h-5 text-xs font-medium">{value}</div>
    </div>
  );
}
