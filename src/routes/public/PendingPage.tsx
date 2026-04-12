import { useConvexAuth, useQuery } from "convex/react";
import { Navigate } from "react-router";
import { api } from "../../../convex/_generated/api";
import Pending from "../../Authenticated/Pending";

export function PendingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser);

  if (isLoading || user === undefined) {
    return <PendingShell label="Checking account state" />;
  }

  if (!isAuthenticated || user === null) {
    return <Navigate replace to="/" />;
  }

  if (user.status !== "pending") {
    return <Navigate replace to="/app" />;
  }

  const pendingUser = user;

  return (
    <PendingShell>
      <Pending user={pendingUser} />
    </PendingShell>
  );
}

function PendingShell({
  children,
  label,
}: {
  action?: React.ReactNode;
  children?: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        {children ?? (
          <p className="text-sm text-muted-foreground">{label ?? "Loading"}</p>
        )}
      </div>
    </div>
  );
}
