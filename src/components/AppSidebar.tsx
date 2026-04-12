import { NavLink, useLocation } from "react-router";
import {
  ChevronRight,
  Home,
  ListTree,
  ShieldCheck,
  Sprout,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { VISIBLE_LEAGUES } from "@/routes/app/leagues";
import { Doc } from "../../convex/_generated/dataModel";

const adminLinks = [
  {
    label: "Admin Dashboard",
    to: "/app/admin",
    icon: ShieldCheck,
    exact: true,
  },
  {
    label: "Users",
    to: "/app/admin/users",
    icon: Users,
    exact: false,
  },
  {
    label: "Manage Seeds",
    to: "/app/admin/seeds",
    icon: Sprout,
    exact: false,
  },
  {
    label: "Manage Leagues",
    to: "/app/admin/leagues",
    icon: ListTree,
    exact: false,
  },
] as const;

export function AppSidebar({ user }: { user: Doc<"users"> }) {
  const location = useLocation();
  const isLeagueRoute = isActivePath(location.pathname, "/app/league");

  const isAdmin = user.roles.includes("admin");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarNavItem
                exact
                icon={Home}
                label="App"
                pathname={location.pathname}
                to="/app"
              />

              <Collapsible
                className="group/collapsible"
                defaultOpen={isLeagueRoute}
                render={<SidebarMenuItem />}
              >
                <SidebarMenuButton
                  isActive={isLeagueRoute}
                  render={<CollapsibleTrigger />}
                  tooltip="Leagues"
                >
                  <Trophy />
                  <span>Leagues</span>
                  <ChevronRight className="ml-auto transition-transform group-data-open/collapsible:rotate-90" />
                </SidebarMenuButton>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {VISIBLE_LEAGUES.map((league) => (
                      <SidebarMenuSubItem key={league.id}>
                        <SidebarMenuSubButton
                          isActive={isActivePath(
                            location.pathname,
                            `/app/league/${league.id}`,
                          )}
                          render={<NavLink to={`/app/league/${league.id}`} />}
                        >
                          <span>{league.name}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminLinks.map((link) => (
                  <SidebarNavItem
                    key={link.to}
                    exact={link.exact}
                    icon={link.icon}
                    label={link.label}
                    pathname={location.pathname}
                    to={link.to}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function SidebarNavItem({
  exact = false,
  icon: Icon,
  label,
  pathname,
  to,
}: {
  exact?: boolean;
  icon: LucideIcon;
  label: string;
  pathname: string;
  to: string;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActivePath(pathname, to, exact)}
        render={<NavLink end={exact} to={to} />}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function isActivePath(pathname: string, to: string, exact = false) {
  if (exact) {
    return pathname === to;
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
