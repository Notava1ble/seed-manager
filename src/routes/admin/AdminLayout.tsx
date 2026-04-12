import type { CSSProperties } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router";

const APP_NAVBAR_HEIGHT = "64px";

export function AdminLayout() {
  return (
    <SidebarProvider
      className="min-h-[calc(100svh-var(--admin-sidebar-top))] **:data-[slot=sidebar-container]:top-(--admin-sidebar-top) **:data-[slot=sidebar-container]:bottom-auto **:data-[slot=sidebar-container]:h-[calc(100svh-var(--admin-sidebar-top))]"
      style={
        {
          "--admin-sidebar-top": APP_NAVBAR_HEIGHT,
        } as CSSProperties
      }
    >
      <AdminSidebar />
      <SidebarInset>
        <main className="p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
