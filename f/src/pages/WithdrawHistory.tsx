import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle, Clock, XCircle, Ban, Loader2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import UsdtIcon from "@/components/ui/usdt-icon";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useToast } from "@/hooks/use-toast";
import { apiService, Withdrawal } from "@/services/api";

const WithdrawHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pageSize = 20;

  // Load withdrawals on component mount and when tab changes
  useEffect(() => {
    loadWithdrawals();
  }, [activeTab]);

  const loadWithdrawals = async (page = 1, append = false) => {
    try {
      if (!append) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        ...(activeTab !== 'all' && { status: activeTab })
      };

      const response = await apiService.getWithdrawalHistory(params);
      
      if (append) {
        setWithdrawals(prev => [...prev, ...response.withdrawals]);
      } else {
        setWithdrawals(response.withdrawals);
      }
      
      setTotalCount(response.total);
      setCurrentPage(page);

    } catch (error: any) {
      console.error('Failed to load withdrawal history:', error);
      toast({
        title: "Error",
        description: "Failed to load withdrawal history. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    const maxPage = Math.ceil(totalCount / pageSize);
    
    if (nextPage <= maxPage) {
      loadWithdrawals(nextPage, true);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId: number) => {
    try {
      await apiService.cancelWithdrawal(withdrawalId);
      
      toast({
        title: "Withdrawal Cancelled",
        description: "Your withdrawal has been cancelled and funds have been refunded.",
      });

      // Refresh the list
      loadWithdrawals();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel withdrawal. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'cancelled':
        return <Ban className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const filteredWithdrawals = activeTab === 'all' 
    ? withdrawals 
    : withdrawals.filter(w => w.status === activeTab);

  const getTabCount = (status: string) => {
    if (status === 'all') return totalCount;
    return withdrawals.filter(w => w.status === status).length;
  };

  const hasMoreData = currentPage * pageSize < totalCount;

  // Show loading state
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="container mx-auto px-4 py-8 max-w-6xl">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading withdrawal history...</p>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Back Button and Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate("/withdraw")}
                className="mb-4 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Withdraw
              </Button>
              <h1 className="text-3xl font-bold mb-2">Withdrawal History</h1>
              <p className="text-muted-foreground">Track your withdrawal requests</p>
            </div>

            {/* Filter Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
                <TabsTrigger value="all" className="gap-2">
                  All <span className="text-xs">({getTabCount('all')})</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  Pending <span className="text-xs">({getTabCount('pending')})</span>
                </TabsTrigger>
                <TabsTrigger value="processing" className="gap-2">
                  Processing <span className="text-xs">({getTabCount('processing')})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  Completed <span className="text-xs">({getTabCount('completed')})</span>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  Rejected <span className="text-xs">({getTabCount('rejected')})</span>
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="gap-2">
                  Cancelled <span className="text-xs">({getTabCount('cancelled')})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-6">
                {filteredWithdrawals.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Withdrawals Found</h3>
                      <p className="text-sm text-muted-foreground">
                        No {activeTab === 'all' ? '' : activeTab} withdrawal requests yet
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredWithdrawals.map((withdrawal) => (
                      <Card key={withdrawal.id} className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                        <CardContent className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                            {/* Left Section: Main Info */}
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${getStatusColor(withdrawal.status)}`}>
                                    {getStatusIcon(withdrawal.status)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xl font-bold">
                                        {withdrawal.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <UsdtIcon className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      Request ID: #{withdrawal.id}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={getStatusColor(withdrawal.status)}>
                                  {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                                </Badge>
                              </div>

                              {/* Wallet & Chain Info */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border/50">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Wallet Address</p>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                                      {withdrawal.wallet_address.slice(0, 12)}...{withdrawal.wallet_address.slice(-8)}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(withdrawal.wallet_address, "Wallet address")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Network</p>
                                  <Badge variant="outline">{withdrawal.chain}</Badge>
                                </div>
                              </div>

                              {/* Transaction Hash */}
                              {withdrawal.tx_hash && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                                      {withdrawal.tx_hash.slice(0, 12)}...{withdrawal.tx_hash.slice(-8)}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => copyToClipboard(withdrawal.tx_hash!, "Transaction hash")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {/* Rejection Reason */}
                              {withdrawal.rejection_reason && (
                                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                  <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                                    Rejection Reason:
                                  </p>
                                  <p className="text-xs text-red-800 dark:text-red-200">
                                    {withdrawal.rejection_reason}
                                  </p>
                                </div>
                              )}

                              {/* Admin Notes */}
                              {withdrawal.admin_notes && (
                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                    Admin Notes:
                                  </p>
                                  <p className="text-xs text-blue-800 dark:text-blue-200">
                                    {withdrawal.admin_notes}
                                  </p>
                                </div>
                              )}

                              {/* Cancel Button for Pending Withdrawals */}
                              {withdrawal.status === 'pending' && (
                                <div className="pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCancelWithdrawal(withdrawal.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    Cancel Withdrawal
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Right Section: Dates */}
                            <div className="lg:text-right space-y-2 lg:min-w-[200px]">
                              <div>
                                <p className="text-xs text-muted-foreground">Requested</p>
                                <p className="text-sm font-medium">{formatDate(withdrawal.requested_at)}</p>
                              </div>
                              {withdrawal.processed_at && (
                                <div>
                                  <p className="text-xs text-muted-foreground">Processed</p>
                                  <p className="text-sm font-medium">{formatDate(withdrawal.processed_at)}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Load More Button */}
                    {hasMoreData && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={isLoadingMore}
                          className="min-w-[120px]"
                        >
                          {isLoadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default WithdrawHistory;