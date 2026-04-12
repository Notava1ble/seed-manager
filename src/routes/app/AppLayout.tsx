import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { Navigate, Outlet } from "react-router";
import { api } from "../../../convex/_generated/api";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "../../components/ui/button";
import { SidebarInset, SidebarProvider } from "../../components/ui/sidebar";
import { Loading } from "../Loading";

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
    <SidebarProvider className="h-screen min-h-screen flex-col overflow-hidden bg-background text-foreground **:data-[slot=sidebar-container]:top-16 **:data-[slot=sidebar-container]:bottom-auto **:data-[slot=sidebar-container]:h-[calc(100svh-4rem)]">
      <nav className="h-16 shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-2 items-end">
              <h1 className="text-xl font-semibold">Seed Checker</h1>
              <p className="text-sm font-medium text-muted-foreground">
                ({user.name ?? "Unknown user"})
              </p>
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

      <div className="flex min-h-0 flex-1">
        <AppSidebar user={user} />
        <SidebarInset className="min-h-0 overflow-auto">
          <main className="p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
