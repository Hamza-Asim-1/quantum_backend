import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownToLine, Search, Calendar, Copy, Check, ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import UsdtIcon from "@/components/ui/usdt-icon";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

type WithdrawalStatus = "pending" | "completed" | "rejected" | "cancelled";

interface WithdrawalRequest {
  id: number;
  user_id: number;
  email: string;
  full_name: string;
  amount: number;
  chain: string;
  wallet_address: string;
  status: WithdrawalStatus;
  tx_hash?: string | null;
  rejection_reason?: string | null;
  admin_notes?: string | null;
  requested_at: string;
  processed_at?: string | null;
  processed_by?: number | null;
  updated_at: string;
}

interface WithdrawalStats {
  byStatus: {
    [key: string]: {
      count: number;
      totalAmount: number;
    };
  };
  recent7Days: {
    count: number;
    totalAmount: number;
  };
  pending: {
    count: number;
    totalAmount: number;
  };
}

// Import the admin service
import { adminWithdrawalAPI } from "@/services/api"; // Adjust path as needed

// If you don't want to create a separate file, keep this inline service:

export default function AdminWithdrawals() {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | WithdrawalStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeRange, setTimeRange] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Data state
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);

  const pageSize = 20;

  // Load data on component mount and when filters change
  useEffect(() => {
    loadWithdrawals();
    loadStats();
  }, [statusFilter, currentPage, searchQuery]);

  const loadWithdrawals = async () => {
    try {
      setIsLoading(true);
      
      const params: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (searchQuery) {
        // If search query is numeric, search by user_id, otherwise search will be handled by backend
        if (/^\d+$/.test(searchQuery)) {
          params.user_id = searchQuery;
        }
        // Note: For email/name search, you'd need to modify the backend to support text search
      }

      const response = await adminWithdrawalAPI.getAllWithdrawals(params);

      setWithdrawals(response.withdrawals);  // ✅ Already correct!
      setTotalCount(response.total);          // ✅ Already correct!

    } catch (error: any) {
      console.error('Failed to load withdrawals:', error);
      toast.error('Failed to load withdrawals');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await adminWithdrawalAPI.getWithdrawalStats();
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusCounts = () => {
    if (!stats) return { all: 0, pending: 0, completed: 0, rejected: 0, cancelled: 0 };
    
    return {
      all: Object.values(stats.byStatus).reduce((sum, status) => sum + status.count, 0),
      pending: stats.byStatus.pending?.count || 0,
      completed: stats.byStatus.completed?.count || 0,
      rejected: stats.byStatus.rejected?.count || 0,
      cancelled: stats.byStatus.cancelled?.count || 0,
    };
  };

  const counts = getStatusCounts();

  const formatRelativeTime = (date: string) => {
    const dateObj = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return format(dateObj, "MMM d, yyyy");
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        {/* Mobile Overlay
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )} */}

        {/* Main Content */}
        <main className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-background border-b shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                {/* <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button> */}
                <SidebarTrigger className="md:hidden" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hover:text-foreground cursor-pointer" onClick={() => navigate("/admin/dashboard")}>
                    Dashboard
                  </span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground font-medium">Withdrawals</span>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto p-6 space-y-6 max-w-7xl">
            {/* Header with Title and Stats */}
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Withdraw Requests</h1>
              </div>

              {/* Status Count Badges */}
              {stats && (
                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full px-4 py-2 text-base border-2 bg-background">
                    All: <span className="font-bold ml-1">{counts.all}</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-2 text-base border-2 border-yellow-500/30 bg-yellow-500/10 text-yellow-700"
                  >
                    Pending: <span className="font-bold ml-1">{counts.pending}</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-2 text-base border-2 border-green-500/30 bg-green-500/10 text-green-700"
                  >
                    Completed: <span className="font-bold ml-1">{counts.completed}</span>
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-4 py-2 text-base border-2 border-red-500/30 bg-red-500/10 text-red-700"
                  >
                    Rejected: <span className="font-bold ml-1">{counts.rejected}</span>
                  </Badge>
                </div>
              )}
            </div>

            {/* Filters Row */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Status Tabs */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "pending" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setStatusFilter("pending");
                      setCurrentPage(1);
                    }}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={statusFilter === "completed" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setStatusFilter("completed");
                      setCurrentPage(1);
                    }}
                  >
                    Completed
                  </Button>
                  <Button
                    variant={statusFilter === "rejected" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      setStatusFilter("rejected");
                      setCurrentPage(1);
                    }}
                  >
                    Rejected
                  </Button>
                </div>

                {/* Search */}
                <div className="relative md:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by user ID"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing {withdrawals.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount} requests
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading withdrawals...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Withdrawal Cards */}
                <div className="space-y-4">
                  {withdrawals.map((withdrawal) => (
                    <Card
                      key={withdrawal.id}
                      className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          {/* Left Section - User Info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">ID:</span>
                              <code className="text-xs bg-muted px-2 py-1 rounded">{withdrawal.user_id}</code>
                              <button
                                onClick={() => handleCopy(withdrawal.user_id.toString(), `user-${withdrawal.id}`)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                aria-label="Copy user ID"
                              >
                                {copiedId === `user-${withdrawal.id}` ? (
                                  <Check className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{withdrawal.full_name}</div>
                              <div className="text-sm text-muted-foreground">{withdrawal.email}</div>
                            </div>
                          </div>

                          {/* Middle Section - Amount */}
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-foreground">
                              {withdrawal.amount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <UsdtIcon className="w-6 h-6" />
                          </div>

                          {/* Right Section - Status & Actions */}
                          <div className="flex flex-col lg:items-end gap-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  "rounded-full px-3 py-1",
                                  withdrawal.status === "pending"
                                    ? "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30 border-yellow-500/30"
                                    : withdrawal.status === "completed"
                                    ? "bg-green-500/20 text-green-700 hover:bg-green-500/30 border-green-500/30"
                                    : withdrawal.status === "rejected"
                                    ? "bg-red-500/20 text-red-700 hover:bg-red-500/30 border-red-500/30"
                                    : "bg-gray-500/20 text-gray-700 hover:bg-gray-500/30 border-gray-500/30"
                                )}
                              >
                                {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                              </Badge>
                            </div>

                            {withdrawal.tx_hash && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">TXN:</span>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {withdrawal.tx_hash.slice(0, 8)}...{withdrawal.tx_hash.slice(-6)}
                                </code>
                                <button
                                  onClick={() => handleCopy(withdrawal.tx_hash!, `txn-${withdrawal.id}`)}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                  aria-label="Copy transaction ID"
                                >
                                  {copiedId === `txn-${withdrawal.id}` ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )}

                            <div className="text-sm text-muted-foreground" title={format(new Date(withdrawal.requested_at), "PPpp")}>
                              {formatRelativeTime(withdrawal.requested_at)}
                            </div>

                            <Button
                              onClick={() => navigate(`/admin/dashboard/withdrawals/${withdrawal.id}`)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                              <ArrowDownToLine className="w-4 h-4 mr-2" />
                              Review Request
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}