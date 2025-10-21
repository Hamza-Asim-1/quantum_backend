import { useState } from "react";
import {
  LayoutDashboard,
  FileCheck,
  CreditCard,
  TrendingUp,
  ArrowDownToLine,
  Gift,
  History,
  Settings,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "KYC Verification", url: "/kyc", icon: FileCheck },
  { title: "Deposit", url: "/deposit", icon: CreditCard },
  { title: "Investments", url: "/investments", icon: TrendingUp },
  { title: "Withdraw", url: "/withdraw", icon: ArrowDownToLine },
  // { title: "Referrals", url: "/referrals", icon: Gift },
  // { title: "Transactions", url: "/transactions", icon: History },
  // { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const currentPath = location.pathname;

  const handleNavigation = (url: string) => {
    navigate(url);
  };

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
            <SidebarGroupLabel className={open ? "" : "sr-only"}>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => {
                  const isActive = currentPath === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() => handleNavigation(item.url)}
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

        {/* User Profile Section */}
        <div className="border-t border-sidebar-border p-4">
          {open ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials(user?.name || "User")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
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
                  {getUserInitials(user?.name || "User")}
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
}
