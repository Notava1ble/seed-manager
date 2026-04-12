import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router";

export function AdminLayout() {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <Outlet />
    </SidebarProvider>
  );
}
