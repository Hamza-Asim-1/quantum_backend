import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ArrowLeft, Copy, Filter, Search, ChevronRight, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { adminUserAPI, AdminUserDetail, LedgerEntry } from "@/services/api";

export default function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);

  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTx, setSearchTx] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (userId) {
      loadUserData();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadLedgerEntries();
    }
  }, [userId, typeFilter, sortOrder, currentPage]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const data = await adminUserAPI.getUserById(userId!);
      setUserDetail(data);
    } catch (error: any) {
      console.error('Failed to load user data:', error);
      toast.error(error.message || 'Failed to load user data');
      navigate('/admin/dashboard/users');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLedgerEntries = async () => {
    try {
      setIsLoadingLedger(true);
      const params: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort: sortOrder,
      };

      if (typeFilter !== 'all') {
        params.transaction_type = typeFilter;
      }

      const data = await adminUserAPI.getUserLedger(userId!, params);
      setLedgerEntries(data.entries);
      setLedgerTotal(data.total);
    } catch (error: any) {
      console.error('Failed to load ledger entries:', error);
      toast.error(error.message || 'Failed to load transaction history');
    } finally {
      setIsLoadingLedger(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
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

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "deposit":
        return "bg-green-100 text-green-700";
      case "withdrawal":
        return "bg-red-100 text-red-700";
      case "investment":
        return "bg-blue-100 text-blue-700";
      case "profit":
        return "bg-purple-100 text-purple-700";
      case "refund":
        return "bg-yellow-100 text-yellow-700";
      case "referral_commission":
        return "bg-pink-100 text-pink-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const sign = ['deposit', 'profit', 'refund', 'referral_commission'].includes(type) ? "+" : "-";
    const color = ['deposit', 'profit', 'refund', 'referral_commission'].includes(type) ? "text-green-600" : "text-red-600";
    return (
      <span className={color}>
        {sign}${Math.abs(amount).toFixed(2)}
      </span>
    );
  };

  const getKYCBadgeClass = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const totalPages = Math.ceil(ledgerTotal / itemsPerPage);

  // Filter transactions client-side for search
  const filteredTransactions = ledgerEntries.filter((tx) => {
    if (!searchTx) return true;
    return (
      tx.id.toString().includes(searchTx) ||
      tx.description.toLowerCase().includes(searchTx.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading user details...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!userDetail) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">User Not Found</h3>
              <Button onClick={() => navigate('/admin/dashboard/users')}>
                Back to Users
              </Button>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const { user, stats } = userDetail;

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
              <button
                onClick={() => navigate("/admin/dashboard/users")}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                Users
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">{user.full_name}</span>
            </nav>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/dashboard/users")}
                className="hover:bg-accent/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Users
              </Button>

              {/* User Profile Section */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    User Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{user.id}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(user.id.toString())}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium text-foreground">{user.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email Address</p>
                      <p className="font-medium text-foreground">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone Number</p>
                      <p className="font-medium text-foreground">{user.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-medium text-foreground">{formatDate(user.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Status</p>
                      <Badge className={user.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KYC Status Section */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle>KYC Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getKYCBadgeClass(user.kyc_status)}`}
                  >
                    {user.kyc_status.charAt(0).toUpperCase() + user.kyc_status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>

              {/* Financial Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardHeader>
                    <CardTitle>Balance Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Balance</p>
                        <p className="font-semibold text-foreground text-lg">
                          ${parseFloat(user.balance?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <p className="font-medium text-foreground">
                          ${parseFloat(user.available_balance?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Invested Balance</p>
                        <p className="font-medium text-blue-600">
                          ${parseFloat(user.invested_balance?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                  <CardHeader>
                    <CardTitle>Activity Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Invested</p>
                        <p className="font-medium text-foreground">
                          ${parseFloat(stats.investments.total_invested?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Profit</p>
                        <p className="font-medium text-green-600">
                          ${parseFloat(stats.total_profit?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                        <p className="font-medium text-foreground">
                          ${parseFloat(stats.withdrawals.total_withdrawn?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Active Investments</p>
                        <Badge variant="outline">
                          {stats.investments.active_count || 0}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Section */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          <Filter className="h-4 w-4" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="deposit">Deposits</SelectItem>
                        <SelectItem value="withdrawal">Withdrawals</SelectItem>
                        <SelectItem value="investment">Investments</SelectItem>
                        <SelectItem value="profit">Profits</SelectItem>
                        <SelectItem value="refund">Refunds</SelectItem>
                        <SelectItem value="referral_commission">Referral Commission</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTx}
                        onChange={(e) => setSearchTx(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-x-auto">
                    {isLoadingLedger ? (
                      <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Balance After</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono text-sm">{tx.id}</TableCell>
                              <TableCell className="whitespace-nowrap">{formatDate(tx.created_at)}</TableCell>
                              <TableCell>
                                <Badge className={`text-xs font-medium capitalize ${getTypeStyle(tx.transaction_type)}`}>
                                  {tx.transaction_type.replace('_', ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {tx.description}
                                {tx.chain && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({tx.chain})
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatAmount(tx.amount, tx.transaction_type)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ${parseFloat(tx.balance_after?.toString() || '0').toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {!isLoadingLedger && filteredTransactions.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No transactions found matching your criteria.</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {filteredTransactions.length > 0 && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1}-
                        {Math.min(currentPage * itemsPerPage, ledgerTotal)} of {ledgerTotal} transactions
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
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
                                onClick={() => setCurrentPage(pageNum)}
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
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}