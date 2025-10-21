import { useState } from "react";
import { Menu, Bell, Wallet, TrendingUp, Clock, Users, AlertCircle } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import UsdtIcon from "@/components/ui/usdt-icon";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kycStatus] = useState<"not-started" | "pending" | "approved" | "rejected">("approved");

  // Mock data
  const stats = {
    totalBalance: 0.0,
    availableBalance: 0.0,
    investedBalance: 0.0,
    totalProfitEarned: 0.0,
    activeInvestments: 0,
    totalReferrals: 0,
    pendingWithdrawals: 0,
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getKycMessage = () => {
    switch (kycStatus) {
      case "not-started":
        return {
          title: "KYC Verification Required",
          message: "Please complete your KYC verification to unlock all features and start investing.",
          action: "Complete KYC",
        };
      case "pending":
        return {
          title: "KYC Verification Pending",
          message: "Your KYC verification is currently being reviewed. This usually takes 24-48 hours.",
          action: "View Status",
        };
      case "rejected":
        return {
          title: "KYC Verification Rejected",
          message: "Your KYC verification was rejected. Please resubmit with correct information.",
          action: "Resubmit KYC",
        };
      default:
        return null;
    }
  };

  const kycMessage = getKycMessage();

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-muted/20 to-background dark:from-background dark:via-primary/5 dark:to-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col w-full">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
            <div className="flex h-16 items-center gap-4 px-4 md:px-6">
              <SidebarTrigger className="md:hidden" />
              <h2 className="text-xl font-semibold text-foreground">Dashboard</h2>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Welcome Card */}
            <Card className="border-0 bg-gradient-to-r from-primary via-primary-glow to-accent text-primary-foreground overflow-hidden relative">
              <div className="absolute inset-0 bg-black/10" />
              <CardContent className="relative p-6 md:p-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
                <p className="text-primary-foreground/90">Here's an overview of your investment portfolio</p>
              </CardContent>
            </Card>

            {/* KYC Warning Banner */}
            {kycStatus !== "approved" && kycMessage && (
              <Alert className="border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                <AlertTitle className="text-yellow-900 dark:text-yellow-100">{kycMessage.title}</AlertTitle>
                <AlertDescription className="text-yellow-800 dark:text-yellow-200 mt-2">
                  {kycMessage.message}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-yellow-600 text-yellow-900 hover:bg-yellow-500/20 dark:text-yellow-100"
                  >
                    {kycMessage.action}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Primary Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Balance */}
              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UsdtIcon className="h-5 w-5" />
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalBalance)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    <span className="text-accent">0%</span> from last month
                  </p>
                </CardContent>
              </Card>

              {/* Available Balance */}
              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UsdtIcon className="h-5 w-5" />
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.availableBalance)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Invested Balance */}
              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Invested Balance</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UsdtIcon className="h-5 w-5" />
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.investedBalance)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Profit Earned */}
              <Card className="border-border/50 bg-card/50 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Profit Earned</CardTitle>
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <UsdtIcon className="h-5 w-5" />
                    <div className="text-2xl font-bold text-accent">{formatCurrency(stats.totalProfitEarned)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Active Investments */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Active Investments</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.activeInvestments}</div>
                </CardContent>
              </Card>

              {/* Total Referrals */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.totalReferrals}</div>
                </CardContent>
              </Card>

              {/* Pending Withdrawals */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{stats.pendingWithdrawals}</div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button className="w-full" onClick={() => navigate("/deposit")}>Deposit</Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/investments")}>
                    Invest
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/withdraw")}>
                    Withdraw
                    </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
