import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, Copy, Check, ChevronLeft, ChevronRight, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { adminKYCAPI, AdminKYCSubmission } from "@/services/api";

type KYCStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminKYC() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [kycData, setKYCData] = useState<AdminKYCSubmission[]>([]);

const currentStatus = (searchParams.get("status") || "all") as KYCStatus;

  // ✅ Update useEffect to watch currentStatus changes
  useEffect(() => {
    loadKYCData();
  }, [currentStatus]); // Re-fetch when status filter changes
  
  const loadKYCData = async () => {
    try {
      setIsLoading(true);
      const params: { status?: string; limit: number } = {
      limit: 1000,
    };
    
    
    if (currentStatus !== 'all') {
      params.status = currentStatus;
    }
      
      // ✅ Use getAllKYC with status filter
const data = await adminKYCAPI.getAllKYC(params);
      
      setKYCData(data);
    } catch (error: any) {
      console.error('Failed to load KYC data:', error);
      toast.error(error.message || 'Failed to load KYC submissions');
    } finally {
      setIsLoading(false);
    }
  };


  
  const currentPage = parseInt(searchParams.get("page") || "1");
  const searchQuery = searchParams.get("search") || "";
  const timeRange = searchParams.get("range") || "all";
  const sortOrder = searchParams.get("sort") || "newest";

  const itemsPerPage = 20;

  const updateSearchParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    setSearchParams(newParams);
  };

  // Filter data
// Filter data - DON'T filter by status again (backend already did it)
const filteredData = kycData
  .filter((item) => {
    // ✅ REMOVED: Status filtering (backend handles this)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.user_id.toString().includes(query) ||
        item.full_name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query)
      );
    }
    return true;
  })
  .filter((item) => {
    if (timeRange === "all") return true;
    const itemDate = new Date(item.submitted_at);
    const now = new Date();
    if (timeRange === "today") {
      return itemDate.toDateString() === now.toDateString();
    }
    if (timeRange === "7days") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }
    if (timeRange === "30days") {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return itemDate >= thirtyDaysAgo;
    }
    return true;
  })
  .sort((a, b) => {
    const dateA = new Date(a.submitted_at).getTime();
    const dateB = new Date(b.submitted_at).getTime();
    return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const statusCounts = {
    all: kycData.length,
    pending: kycData.filter((item) => item.status === "pending").length,
    approved: kycData.filter((item) => item.status === "approved").length,
    rejected: kycData.filter((item) => item.status === "rejected").length,
  };

  const handleCopyId = (userId: number) => {
    navigator.clipboard.writeText(userId.toString());
    setCopiedId(userId.toString());
    toast.success("User ID copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10 flex items-center px-6">
            <SidebarTrigger className="md:hidden mr-4" />
            <nav className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Dashboard
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">KYC</span>
            </nav>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Page Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold text-foreground">KYC Reviews</h1>
                </div>

                {/* Count Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-sm font-medium bg-muted text-foreground border-border"
                  >
                    All ({statusCounts.all})
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-sm font-medium bg-yellow-100 text-yellow-800 border-yellow-300"
                  >
                    Pending ({statusCounts.pending})
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-sm font-medium bg-green-100 text-green-800 border-green-300"
                  >
                    Approved ({statusCounts.approved})
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-sm font-medium bg-red-100 text-red-800 border-red-300"
                  >
                    Rejected ({statusCounts.rejected})
                  </Badge>
                </div>
              </div>

              {/* Filters Section */}
              <Card className="p-4 bg-card border-border">
                <div className="space-y-4">
                  {/* Status Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={currentStatus === status ? "default" : "ghost"}
                        onClick={() => updateSearchParams({ status, page: "1" })}
                        className={
                          currentStatus === status
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/10 hover:text-accent-foreground"
                        }
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>

                  {/* Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by User ID, Name, or Email"
                        value={searchQuery}
                        onChange={(e) => updateSearchParams({ search: e.target.value, page: "1" })}
                        className="pl-10"
                      />
                    </div>

                    {/* Time Range */}
                    <Select value={timeRange} onValueChange={(value) => updateSearchParams({ range: value, page: "1" })}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="7days">Last 7 Days</SelectItem>
                        <SelectItem value="30days">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Sort */}
                    <Select value={sortOrder} onValueChange={(value) => updateSearchParams({ sort: value })}>
                      <SelectTrigger>
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

              {/* Results List */}
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-6">
                      <Skeleton className="h-16 w-full" />
                    </Card>
                  ))
                ) : paginatedData.length === 0 ? (
                  <Card className="p-12 text-center">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No KYC submissions found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
                  </Card>
                ) : (
                  paginatedData.map((item) => (
                    <Card
                      key={item.id}
                      className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/admin/dashboard/kyc/${item.id}`)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Left: User ID */}
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <code className="text-sm font-mono text-muted-foreground">USR{item.user_id}</code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyId(item.user_id);
                            }}
                            className="p-1 hover:bg-accent/10 rounded transition-colors"
                          >
                            {copiedId === item.user_id.toString() ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        {/* Center: User Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{item.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{item.email}</p>
                        </div>

                        {/* Document Type */}
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          {item.document_type.replace('_', ' ').toUpperCase()}
                        </Badge>

                        {/* Status */}
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-1 ${getStatusBadgeVariant(item.status)}`}
                        >
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </Badge>

                        {/* Right: Date and Button */}
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block">
                            <p className="text-sm text-muted-foreground">{formatDate(item.submitted_at)}</p>
                          </div>
                          <Button
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/dashboard/kyc/${item.id}`);
                            }}
                          >
                            Review KYC
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredData.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} submissions
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSearchParams({ page: String(currentPage - 1) })}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateSearchParams({ page: String(pageNum) })}
                            className={currentPage === pageNum ? "bg-primary text-primary-foreground" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSearchParams({ page: String(currentPage + 1) })}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}