import { Outlet } from "react-router";

export function AdminLayout() {
  return (
    <main className="p-6">
      <Outlet />
    </main>
  );
}
