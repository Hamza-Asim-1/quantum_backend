import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Search, ChevronRight, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { adminUserAPI, AdminUser } from "@/services/api";

type KYCStatus = "all" | "pending" | "approved" | "rejected";

export default function AdminUsers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);

  const currentStatus = (searchParams.get("kyc_status") || "all") as KYCStatus;
  const searchQuery = searchParams.get("search") || "";
  const sortOrder = searchParams.get("sort") || "newest";
  const currentPage = parseInt(searchParams.get("page") || "1");
  const itemsPerPage = 20;

  useEffect(() => {
    loadUsers();
  }, [currentStatus, searchQuery, sortOrder, currentPage]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      const params: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort: sortOrder,
      };

      if (currentStatus !== 'all') {
        params.kyc_status = currentStatus;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      const data = await adminUserAPI.getAllUsers(params);
      setUsers(data.users);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Failed to load users:', error);
      toast.error(error.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

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

  const getKYCBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
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
    });
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  // Calculate status counts from current data
  const statusCounts = {
    all: total,
    approved: users.filter(u => u.kyc_status === 'approved').length,
    pending: users.filter(u => u.kyc_status === 'pending').length,
    rejected: users.filter(u => u.kyc_status === 'rejected').length,
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10 flex items-center px-6">
            <nav className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate("/admin/dashboard")}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Dashboard
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">Users</span>
            </nav>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Page Header */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-8 w-8 text-primary" />
                  <h1 className="text-3xl font-bold text-foreground">Users</h1>
                </div>

                {/* Count Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-1 text-sm font-medium bg-muted text-foreground border-border"
                  >
                    Total: {total}
                  </Badge>
                </div>
              </div>

              {/* Filters Section */}
              <Card className="p-4 bg-card border-border">
                <div className="space-y-4">
                  {/* Status Tabs */}
                  <div className="flex flex-wrap gap-2">
                    {(["all", "approved", "pending", "rejected"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={currentStatus === status ? "default" : "ghost"}
                        onClick={() => updateSearchParams({ kyc_status: status, page: "1" })}
                        className={
                          currentStatus === status
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/10 hover:text-accent-foreground"
                        }
                      >
                        {status === 'all' ? 'All Users' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>

                  {/* Filters Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, email, or ID..."
                        value={searchQuery}
                        onChange={(e) => updateSearchParams({ search: e.target.value, page: "1" })}
                        className="pl-10"
                      />
                    </div>

                    {/* Sort */}
                    <Select value={sortOrder} onValueChange={(value) => updateSearchParams({ sort: value, page: "1" })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="nameAsc">Name A-Z</SelectItem>
                        <SelectItem value="nameDesc">Name Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Users List */}
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i} className="p-6">
                      <Skeleton className="h-20 w-full" />
                    </Card>
                  ))
                ) : users.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
                    <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
                  </Card>
                ) : (
                  users.map((user) => (
                    <Card
                      key={user.id}
                      className="p-6 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/admin/dashboard/users/${user.id}`)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Left: User ID */}
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <code className="text-sm font-mono text-muted-foreground">ID: {user.id}</code>
                        </div>

                        {/* Center: User Info */}
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{user.full_name}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.phone && (
                            <p className="text-xs text-muted-foreground mt-1">{user.phone}</p>
                          )}
                        </div>

                        {/* Balance Info */}
                        <div className="text-right min-w-[120px]">
                          <p className="text-xs text-muted-foreground">Balance</p>
                          <p className="font-semibold text-foreground">
                            ${parseFloat(user.balance?.toString() || '0').toFixed(2)}
                          </p>
                          {parseFloat(user.invested_balance?.toString() || '0') > 0 && (
                            <p className="text-xs text-blue-600">
                              Invested: ${parseFloat(user.invested_balance?.toString() || '0').toFixed(2)}
                            </p>
                          )}
                        </div>

                        {/* KYC Status */}
                        <Badge
                          variant="outline"
                          className={`rounded-full px-3 py-1 ${getKYCBadgeClass(user.kyc_status)}`}
                        >
                          {user.kyc_status.charAt(0).toUpperCase() + user.kyc_status.slice(1)}
                        </Badge>

                        {/* Right: Date and Button */}
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden md:block min-w-[100px]">
                            <p className="text-xs text-muted-foreground">Joined</p>
                            <p className="text-sm text-foreground">{formatDate(user.created_at)}</p>
                          </div>
                          <Button
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/dashboard/users/${user.id}`);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {users.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(currentPage * itemsPerPage, total)} of {total} users
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateSearchParams({ page: String(currentPage - 1) })}
                      disabled={currentPage === 1}
                    >
                      Previous
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
                      Next
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