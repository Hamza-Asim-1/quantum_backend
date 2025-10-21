import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Bell,
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  ArrowRight,
  TrendingUp,
  ArrowDownToLine,
  Loader2,
  FileCheck,
} from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminKYCAPI, adminWithdrawalAPI, adminUserAPI, AdminDashboardStats } from "@/services/api";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [withdrawalStats, setWithdrawalStats] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all stats in parallel
      const [dashboardStats, withdrawals, users] = await Promise.all([
        adminKYCAPI.getDashboardStats(),
        adminWithdrawalAPI.getWithdrawalStats().catch(() => null),
        adminUserAPI.getUserStats().catch(() => null),
      ]);

      setStats(dashboardStats);
      setWithdrawalStats(withdrawals);
      setUserStats(users);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const UsdtIcon = () => (
    <img
      src="https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/svg/color/usdt.svg"
      alt="USDT"
      className="w-4 h-4"
    />
  );

  const StatCard = ({ icon: Icon, title, value, subtitle, accentColor, showUsdt = false, isLoading = false }: any) => (
    <Card className="rounded-lg border bg-card text-card-foreground shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 min-w-[280px] flex-shrink-0 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${accentColor || "bg-primary/10"}`}>
            <Icon className={`w-5 h-5 ${accentColor ? "" : "text-primary"}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-sm font-medium text-muted-foreground mb-2">{title}</CardTitle>
        {isLoading ? (
          <div className="h-8 flex items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {showUsdt && <UsdtIcon />}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  const SectionHeading = ({ title, path }: { title: string; path: string }) => (
    <button
      onClick={() => navigate(path)}
      className="group flex items-center gap-2 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity mb-4"
    >
      {title}
      <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" />
    </button>
  );

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-muted/20 to-background">
        <AdminSidebar />

        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
            <div className="flex h-16 items-center gap-4 px-4 md:px-6">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
            {/* Users Section */}
            <section>
              <SectionHeading title="Users Overview" path="/admin/dashboard/users" />
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <StatCard
                  icon={Users}
                  title="Total Users"
                  value={stats?.users.total || userStats?.total_users || 0}
                  subtitle="All registered users"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={UserCheck}
                  title="Verified Users"
                  value={stats?.users.verified || userStats?.verified_users || 0}
                  subtitle="KYC approved"
                  accentColor="bg-green-100 text-green-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={UserX}
                  title="Unverified Users"
                  value={
                    (stats?.users.total || 0) - (stats?.users.verified || 0)
                  }
                  subtitle="Pending verification"
                  accentColor="bg-orange-100 text-orange-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={TrendingUp}
                  title="Recent Signups"
                  value={stats?.users.recentSignups || userStats?.recent_signups || 0}
                  subtitle="Last 7 days"
                  accentColor="bg-blue-100 text-blue-600"
                  isLoading={isLoading}
                />
              </div>
            </section>

            {/* KYC Section */}
            <section>
              <SectionHeading title="KYC Management" path="/admin/dashboard/kyc" />
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <StatCard
                  icon={Clock}
                  title="Pending Submissions"
                  value={stats?.kyc.pending || 0}
                  subtitle="Awaiting review"
                  accentColor="bg-yellow-100 text-yellow-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={CheckCircle}
                  title="Approved"
                  value={stats?.kyc.approved || 0}
                  subtitle="Total approved"
                  accentColor="bg-green-100 text-green-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={XCircle}
                  title="Rejected"
                  value={stats?.kyc.rejected || 0}
                  subtitle="Total rejected"
                  accentColor="bg-red-100 text-red-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={FileCheck}
                  title="Total Submissions"
                  value={stats?.kyc.total || 0}
                  subtitle="All time"
                  isLoading={isLoading}
                />
              </div>
            </section>

            {/* Withdrawals Section */}
            <section>
              <SectionHeading title="Withdrawal Management" path="/admin/dashboard/withdrawals" />
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <StatCard
                  icon={Clock}
                  title="Pending/Requested"
                  value={withdrawalStats?.pending?.count || 0}
                  subtitle={withdrawalStats?.pending?.totalAmount 
                    ? `$${parseFloat(withdrawalStats.pending.totalAmount).toFixed(2)}` 
                    : 'Awaiting approval'}
                  accentColor="bg-orange-100 text-orange-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={CheckCircle}
                  title="Completed (7 Days)"
                  value={withdrawalStats?.recent7Days?.count || 0}
                  subtitle={withdrawalStats?.recent7Days?.totalAmount
                    ? `$${parseFloat(withdrawalStats.recent7Days.totalAmount).toFixed(2)}`
                    : 'Successfully processed'}
                  accentColor="bg-green-100 text-green-600"
                  isLoading={isLoading}
                />
                <StatCard
                  icon={ArrowDownToLine}
                  title="Total Volume"
                  value={
                    withdrawalStats?.byStatus?.completed?.totalAmount
                      ? parseFloat(withdrawalStats.byStatus.completed.totalAmount).toFixed(2)
                      : '0.00'
                  }
                  subtitle="All time"
                  showUsdt
                  isLoading={isLoading}
                />
              </div>
            </section>

            {/* Deposits Section */}
            <section>
              <SectionHeading title="Deposits Overview" path="/admin/dashboard/deposits" />
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                <StatCard
                  icon={DollarSign}
                  title="Total Deposits"
                  value={stats?.deposits.total 
                    ? parseFloat(stats.deposits.total.toString()).toFixed(2)
                    : '0.00'}
                  subtitle={`${stats?.deposits.count || 0} transactions`}
                  showUsdt
                  isLoading={isLoading}
                />
              </div>
            </section>
          </main>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </SidebarProvider>
  );
}