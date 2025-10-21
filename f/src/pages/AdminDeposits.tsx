// frontend/src/pages/AdminDeposits.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, ChevronDown, Menu, X, Loader2 } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { adminDepositAPI, AdminDepositDetail } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const AdminDeposits = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [chainFilter, setChainFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [deposits, setDeposits] = useState<AdminDepositDetail[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const pageSize = 20;

  // Load deposits when filters change
  useEffect(() => {
    loadDeposits();
  }, [currentPage, statusFilter, chainFilter, sortBy]);

  const loadDeposits = async () => {
    try {
      setIsLoading(true);
      
      const params: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (chainFilter && chainFilter !== 'all') {
        params.chain = chainFilter;
      }

      const data = await adminDepositAPI.getAllDeposits(params);
      
      let sortedDeposits = [...data.deposits];
      
      // Sort by date
      if (sortBy === "newest") {
        sortedDeposits.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      } else {
        sortedDeposits.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      setDeposits(sortedDeposits);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Failed to load deposits:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load deposits",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side search filter
  const filteredDeposits = deposits.filter(deposit => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      deposit.full_name?.toLowerCase().includes(query) ||
      deposit.email?.toLowerCase().includes(query) ||
      deposit.id.toString().includes(query) ||
      deposit.tx_hash?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(total / pageSize);

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const depositDate = new Date(date);
    const diffMs = now.getTime() - depositDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return format(depositDate, "MMM d, yyyy");
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <AdminSidebar />
        
        {/* Mobile Menu Overlay */}
        {/* {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )} */}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-4">
                {/* <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button> */}
                <SidebarTrigger className="md:hidden" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Deposits</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage and review user deposit records
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {/* Filters */}
            <Card className="p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Chain Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Chain
                  </label>
                  <Select value={chainFilter} onValueChange={(value) => {
                    setChainFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Chains</SelectItem>
                      <SelectItem value="TRC20">TRC20</SelectItem>
                      <SelectItem value="BEP20">BEP20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Name, email, tx hash..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Sort */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Sort By
                  </label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Results Count */}
            <div className="mb-4 text-sm text-gray-600">
              Showing {filteredDeposits.length} of {total} deposits
            </div>

            {/* Loading State */}
            {isLoading ? (
              <Card className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading deposits...</p>
              </Card>
            ) : (
              <>
                {/* Deposits List */}
                <div className="space-y-3">
                  {filteredDeposits.map((deposit) => (
                    <Card
                      key={deposit.id}
                      className="p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(`/admin/dashboard/deposits/${deposit.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {deposit.full_name}
                            </h3>
                            <Badge
                              variant="default"
                              className={getStatusBadgeClass(deposit.status)}
                            >
                              {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                            </Badge>
                            <Badge variant="outline">
                              {deposit.chain}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {deposit.email}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {deposit.amount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-sm font-normal text-gray-600">USDT</span>
                            </p>
                            <p className="text-sm text-gray-500" title={format(new Date(deposit.created_at), "PPpp")}>
                              {formatRelativeTime(deposit.created_at)}
                            </p>
                          </div>

                          <Button variant="outline" size="sm" onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/dashboard/deposits/${deposit.id}`);
                          }}>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Empty State */}
                {filteredDeposits.length === 0 && (
                  <Card className="p-12 text-center">
                    <div className="max-w-md mx-auto">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No deposits found
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Try adjusting your filters or search query to find what you're looking for.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setChainFilter("all");
                          setCurrentPage(1);
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
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
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDeposits;