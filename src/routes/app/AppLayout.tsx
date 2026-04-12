import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { NavLink, Navigate, Outlet } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Button } from "../../components/ui/button";
import { Loading } from "../Loading";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { signOut } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const user = useQuery(api.users.currentUser);

  if (isLoading || user === undefined) {
    return <Loading label="Loading app" />;
  }

  if (!isAuthenticated || user === null) {
    return <Navigate replace to="/" />;
  }

  if (user.status === "pending") {
    return <Navigate replace to="/pending" />;
  }

  if (user.status !== "active") {
    return <Navigate replace to="/" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex gap-2 items-end">
              <h1 className="text-xl font-semibold clas">Seed Checker</h1>
              <p className="text-sm font-medium text-muted-foreground">
                ({user.name ?? "Unknown user"})
              </p>
            </div>
            <div className="flex gap-2">
              <NavItem label="Home" to="/app" />
              <NavItem label="Admin" to="/app/admin" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Active
            </p>
            <Button
              className="text-foreground"
              size="sm"
              variant="link"
              onClick={() => void signOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <main className="min-h-[calc(100vh-65px)] p-6">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ label, to }: { label: string; to: string }) {
  return (
    <NavLink
      className={({ isActive }) => {
        const currentRouteIsAdmin = location.pathname.startsWith("/app/admin");
        const shouldBeActive = currentRouteIsAdmin
          ? to === "/app/admin"
          : isActive;

        return cn(
          "block p-2 border-b-2",
          shouldBeActive
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-foreground",
        );
      }}
      to={to}
    >
      {label}
    </NavLink>
  );
}
