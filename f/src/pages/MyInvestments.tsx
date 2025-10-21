import { ArrowLeft, FolderOpen, Trash2 } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { apiService, Investment } from "@/services/api";
import UsdtIcon from "@/components/ui/usdt-icon";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MyInvestments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [investment, setInvestment] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load investment data on component mount
  useEffect(() => {
    loadInvestment();
  }, []);

  const loadInvestment = async () => {
    try {
      setIsLoading(true);
      console.log('Loading current investment...'); // Debug log
      
      const currentInvestment = await apiService.getCurrentInvestment();
      console.log('Investment loaded:', currentInvestment); // Debug log
      
      setInvestment(currentInvestment);
    } catch (error: any) {
      console.error('Investment load error:', error); // Debug log
      
      // Only show toast for non-404 errors (404 means no active investment)
      if (!error.message.includes('404') && !error.message.includes('No active investment found')) {
        console.error('Failed to load investment:', error);
        toast({
          title: "Error",
          description: "Failed to load investment data. Please refresh the page.",
          variant: "destructive",
        });
      }
      // If 404, it means no active investment - this is normal
      setInvestment(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30";
      case "completed":
        return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30";
      default:
        return "bg-white/10 text-foreground border-border/40";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteInvestment = async () => {
    if (!investment) return;
    
    setIsDeleting(true);
    
    try {
      console.log('Deleting investment with ID:', investment.id); // Debug log
      
      const result = await apiService.deleteInvestment(investment.id);
      
      setInvestment(null);
      
      toast({
        title: "Investment Deleted",
        description: `Your investment has been successfully deleted. ${result.refunded_amount} USDT has been refunded to your available balance.`,
      });

      // Navigate back to investments page after successful deletion
      setTimeout(() => {
        navigate("/investments");
      }, 2000);

    } catch (error: any) {
      console.error("Delete investment error:", error);
      
      toast({
        title: "Error",
        description: error.message || "Failed to delete investment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-6 md:p-8 flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading investment...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar />

        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <Button
                onClick={() => navigate("/investments")}
                variant="ghost"
                className="flex items-center gap-2 hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Investments
              </Button>
              
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  My Investment
                </h1>
                <p className="text-muted-foreground mt-2">View and manage your current investment</p>
              </div>
            </div>

            {/* Investment Card */}
            {!investment ? (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <FolderOpen className="w-16 h-16 text-muted-foreground/50" />
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">No Active Investment</h3>
                    <p className="text-muted-foreground mt-2">Start investing to see your investment here</p>
                  </div>
                  <Button
                    onClick={() => navigate("/investments")}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Create Investment
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 max-w-2xl">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="outline"
                      className="bg-white/10 border-border/40 text-foreground"
                    >
                      LEVEL {investment.level}
                    </Badge>
                    <span className="text-sm text-muted-foreground">#{investment.id}</span>
                  </div>
                  <CardTitle className="text-2xl text-foreground">{investment.level_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Investment Amount */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <UsdtIcon className="w-6 h-6" />
                      <span className="text-3xl font-bold text-foreground">
                        {investment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xl text-foreground/70">USDT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {investment.profit_rate}% daily
                      </span>
                    </div>
                  </div>

                  {/* Daily Profit */}
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                    <div className="text-xs text-foreground/60 mb-1">Daily Profit</div>
                    <div className="flex items-center gap-2">
                      <UsdtIcon className="w-5 h-5" />
                      <span className="text-2xl font-bold text-primary">
                        {investment.daily_profit}
                      </span>
                      <span className="text-sm text-foreground/70">USDT per day</span>
                    </div>
                  </div>

                  {/* Total Profit Earned */}
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="text-xs text-foreground/60 mb-1">Total Profit Earned</div>
                    <div className="flex items-center gap-2">
                      <UsdtIcon className="w-5 h-5" />
                      <span className="text-2xl font-bold text-accent">
                        {investment.total_profit_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-foreground/70">USDT</span>
                    </div>
                  </div>

                  {/* Status & Dates */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getStatusBadgeClass(investment.status)}>
                        {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                      </Badge>
                      {investment.status === "active" && (
                        <span className="text-sm text-foreground/60">
                          Active for {investment.days_active} days
                        </span>
                      )}
                    </div>
                    
                    {investment.status === "active" && (
                      <p className="text-sm text-foreground/60">
                        Next profit: <span className="font-medium text-foreground">{investment.next_profit}</span>
                      </p>
                    )}
                    
                    <p className="text-sm text-foreground/60">
                      Created: <span className="font-medium text-foreground">{formatTimeAgo(investment.created_at)}</span>
                    </p>
                  </div>

                  {/* Delete Button - Only show for active investments */}
                  {investment.status === "active" && (
                    <div className="pt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            className="w-full flex items-center gap-2"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                            {isDeleting ? "Deleting..." : "Delete Investment"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your investment
                              and refund the full amount ({investment.amount.toLocaleString()} USDT) to your available balance.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteInvestment}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={isDeleting}
                            >
                              {isDeleting ? "Deleting..." : "Delete Investment"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default MyInvestments;