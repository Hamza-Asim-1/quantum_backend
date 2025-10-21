// frontend/src/pages/DepositHistory.tsx
import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Loader2, CheckCircle, XCircle, Ban, Copy, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import UsdtIcon from "@/components/ui/usdt-icon";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { apiService, Deposit } from "@/services/api";

const DepositHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Load deposits when tab changes or page changes
  useEffect(() => {
    loadDeposits();
  }, [activeTab, currentPage]);

  const loadDeposits = async () => {
    try {
      setIsLoading(true);
      const statusFilter = activeTab === 'all' ? undefined : activeTab;
      
      const data = await apiService.getDepositHistory({
        status: statusFilter,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      });

      setDeposits(data.deposits);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Failed to load deposits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load deposit history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5" />;
      case "confirmed":
        return <CheckCircle className="h-5 w-5" />;
      case "failed":
        return <XCircle className="h-5 w-5" />;
      default:
        return <Clock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "confirmed":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20";
      case "confirmed":
        return "bg-green-500/20";
      case "failed":
        return "bg-red-500/20";
      default:
        return "bg-gray-500/20";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const truncateAddress = (address: string, start = 8, end = 8) => {
    if (!address || address.length <= start + end) return address;
    return `${address.slice(0, start)}...${address.slice(-end)}`;
  };

  const getTabCount = (status: string) => {
    if (status === "all") return total;
    return deposits.filter((d) => d.status === status).length;
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <Button variant="ghost" onClick={() => navigate("/deposit")} className="mb-4 -ml-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deposit
              </Button>
              <h1 className="text-3xl font-bold">Deposit History</h1>
              <p className="text-muted-foreground mt-2">Track your deposit requests and their status</p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value);
              setCurrentPage(1);
            }} className="space-y-6">
              <TabsList className="flex flex-wrap h-auto gap-2 bg-muted/50 p-2">
                <TabsTrigger value="all" className="flex-1 sm:flex-initial">
                  All
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex-1 sm:flex-initial">
                  Pending
                </TabsTrigger>
                <TabsTrigger value="confirmed" className="flex-1 sm:flex-initial">
                  Confirmed
                </TabsTrigger>
                <TabsTrigger value="failed" className="flex-1 sm:flex-initial">
                  Failed
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-4">
                {isLoading ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                      <p className="text-muted-foreground">Loading deposits...</p>
                    </CardContent>
                  </Card>
                ) : deposits.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No deposits found</h3>
                      <p className="text-muted-foreground mb-6">
                        {activeTab === "all"
                          ? "You haven't made any deposits yet"
                          : `No ${activeTab} deposits at the moment`}
                      </p>
                      <Button onClick={() => navigate("/deposit")}>Make Your First Deposit</Button>
                    </CardContent>
                  </Card>
                ) : (
                  deposits.map((deposit) => (
                    <Card key={deposit.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          {/* Left Section */}
                          <div className="flex items-start gap-4 flex-1">
                            {/* Status Icon */}
                            <div className={`p-3 rounded-lg ${getStatusBgColor(deposit.status)} flex-shrink-0`}>
                              {getStatusIcon(deposit.status)}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              {/* Amount & ID */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <UsdtIcon className="w-5 h-5" />
                                  <span className="text-2xl font-bold">
                                    {deposit.amount.toLocaleString("en-US", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground">#{deposit.id}</span>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2 mb-3">
                                <Badge variant="outline" className={getStatusColor(deposit.status)}>
                                  {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                                </Badge>
                                <Badge variant="outline">{deposit.chain}</Badge>
                              </div>

                              {/* Transaction Hash */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-muted-foreground">Transaction Hash:</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                    {truncateAddress(deposit.tx_hash, 10, 10)}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => copyToClipboard(deposit.tx_hash, "Transaction Hash")}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>

                                {deposit.to_address && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground">To Address:</span>
                                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                      {truncateAddress(deposit.to_address, 12, 12)}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={() => copyToClipboard(deposit.to_address!, "Address")}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Section - Dates */}
                          <div className="text-sm space-y-2 sm:text-right flex-shrink-0">
                            <div>
                              <p className="text-muted-foreground text-xs">Submitted</p>
                              <p className="font-medium">{formatDate(deposit.created_at)}</p>
                            </div>
                            {deposit.verified_at && (
                              <div>
                                <p className="text-muted-foreground text-xs">Verified</p>
                                <p className="font-medium text-green-600">{formatDate(deposit.verified_at)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {/* Admin Notes */}
                      {deposit.admin_notes && (
                        <CardContent className="pt-0 pb-4">
                          <div className={`${deposit.status === 'failed' ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20'} border rounded-lg p-3`}>
                            <p className={`text-sm font-medium ${deposit.status === 'failed' ? 'text-red-600' : 'text-blue-600'} mb-1`}>
                              {deposit.status === 'failed' ? 'Failed' : 'Admin Notes'}
                            </p>
                            <p className={`text-sm ${deposit.status === 'failed' ? 'text-red-600/80' : 'text-blue-600/80'}`}>
                              {deposit.admin_notes}
                            </p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} ({total} total)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
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

export default DepositHistory;