import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileCheck,
  ArrowDownToLine,
  ArrowUpToLine,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminAuthAPI } from "@/services/api"; // ✅ Import admin auth
import { toast } from "sonner"; // ✅ Import toast

const navigationItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { title: "Users", icon: Users, path: "/admin/dashboard/users" },
  { title: "KYC Management", icon: FileCheck, path: "/admin/dashboard/kyc" },
  { title: "Withdrawals", icon: ArrowDownToLine, path: "/admin/dashboard/withdrawals" },
  { title: "Deposits", icon: ArrowUpToLine, path: "/admin/dashboard/deposits" },
];

export const AdminSidebar = () => {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Get admin info
  const admin = adminAuthAPI.getAdmin();

  const isActivePath = (path: string) => {
    if (path === "/admin/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // ✅ Updated logout handler
  const handleLogout = () => {
    adminAuthAPI.logout();
    toast.success("Logged out successfully");
    navigate("/admin/signin");
  };

  return (
    <Sidebar className="border-r border-sidebar-border" collapsible="icon">
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="px-4 py-6 border-b border-sidebar-border">
          <h1
            className={`font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent transition-all ${
              open ? "text-2xl" : "text-lg"
            }`}
          >
            {open ? "Quantum Pips" : "QP"}
          </h1>
        </div>

        {/* Navigation Menu */}
        <SidebarContent className="flex-1 overflow-y-auto">
          <SidebarGroup>
            <SidebarGroupLabel className={open ? "" : "sr-only"}>Admin Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const isActive = isActivePath(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={isActive}
                        tooltip={item.title}
                        className={`
                          transition-all duration-200
                          ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary"
                              : "hover:bg-sidebar-accent/50"
                          }
                        `}
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span className="flex-1">{item.title}</span>}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Admin Profile & Logout Section */}
        <div className="border-t border-sidebar-border p-4">
          {open ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {admin?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {admin?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {admin?.email || 'admin@quantumpips.com'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full justify-start">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {admin?.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8" title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
};