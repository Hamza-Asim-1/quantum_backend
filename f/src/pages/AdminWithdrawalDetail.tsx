import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowDownToLine, Copy, Check, ChevronLeft, ChevronRight, ArrowLeft, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import UsdtIcon from "@/components/ui/usdt-icon";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { adminWithdrawalAPI, AdminWithdrawalDetail as WithdrawalDetail } from "@/services/api";

export default function AdminWithdrawalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [withdrawal, setWithdrawal] = useState<WithdrawalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [transactionIdInput, setTransactionIdInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadWithdrawalDetails();
    }
  }, [id]);

  const loadWithdrawalDetails = async () => {
    try {
      setIsLoading(true);
      const withdrawalData = await adminWithdrawalAPI.getWithdrawalById(id!);
      setWithdrawal(withdrawalData);
    } catch (error: any) {
      console.error('Failed to load withdrawal details:', error);
      toast.error('Failed to load withdrawal details');
      navigate("/admin/dashboard/withdrawals");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApprove = async () => {
    if (!transactionIdInput.trim()) {
      toast.error("Please enter a transaction ID");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedWithdrawal = await adminWithdrawalAPI.approveWithdrawal(
        id!,
        transactionIdInput,
        adminNotesInput || undefined
      );

      setWithdrawal(prev => prev ? { ...prev, ...updatedWithdrawal, status: 'completed' } : null);

      toast.success("Withdrawal approved successfully");
      setShowApproveModal(false);
      setTransactionIdInput("");
      setAdminNotesInput("");
    } catch (error: any) {
      toast.error(error.message || "Failed to approve withdrawal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReasonInput.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }

    setIsSubmitting(true);

    try {
      await adminWithdrawalAPI.rejectWithdrawal(id!, rejectionReasonInput);

      setWithdrawal(prev => prev ? {
        ...prev,
        status: 'rejected',
        rejection_reason: rejectionReasonInput,
        processed_at: new Date().toISOString()
      } : null);

      toast.success("Withdrawal rejected successfully");
      setShowRejectModal(false);
      setRejectionReasonInput("");
    } catch (error: any) {
      toast.error(error.message || "Failed to reject withdrawal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRelativeTime = (date: string) => {
    const dateObj = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return format(dateObj, "MMM d, yyyy 'at' h:mm a");
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1">
            <div className="container mx-auto p-6 space-y-6 max-w-5xl">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading withdrawal details...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  if (!withdrawal) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <main className="flex-1">
            <div className="container mx-auto p-6 space-y-6 max-w-5xl">
              <Card className="max-w-md mx-auto">
                <CardContent className="p-12 text-center">
                  <h3 className="text-lg font-semibold mb-2">Withdrawal not found</h3>
                  <p className="text-muted-foreground mb-4">
                    The requested withdrawal doesn't exist or you don't have access to it.
                  </p>
                  <Button onClick={() => navigate("/admin/dashboard/withdrawals")}>Back to Withdrawals</Button>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-background border-b shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="hover:text-foreground cursor-pointer" onClick={() => navigate("/admin/dashboard")}>
                    Dashboard
                  </span>
                  <ChevronRight className="w-4 h-4" />
                  <span
                    className="hover:text-foreground cursor-pointer"
                    onClick={() => navigate("/admin/dashboard/withdrawals")}
                  >
                    Withdrawals
                  </span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-foreground font-medium">{withdrawal.full_name} Withdrawal</span>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto p-6 space-y-6 max-w-5xl">
            {/* Back Button and Title */}
            <div className="space-y-4">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/dashboard/withdrawals")}
                className="hover:bg-accent hover:text-accent-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {withdrawal.full_name} - #{withdrawal.id}
                  </h1>
                  <p className="text-muted-foreground mt-1">User ID: {withdrawal.user_id}</p>
                </div>
                <Badge
                  className={cn(
                    "rounded-full px-4 py-2 text-base h-auto",
                    withdrawal.status === "pending"
                      ? "bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30 border-yellow-500/30"
                      : withdrawal.status === "completed"
                      ? "bg-green-500/20 text-green-700 hover:bg-green-500/30 border-green-500/30"
                      : withdrawal.status === "rejected"
                      ? "bg-red-500/20 text-red-700 hover:bg-red-500/30 border-red-500/30"
                      : "bg-gray-500/20 text-gray-700 hover:bg-gray-500/30 border-gray-500/30",
                  )}
                >
                  {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                </Badge>
              </div>
            </div>

            {/* Available Balance Card */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/20">
                    <ArrowDownToLine className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Withdrawal Amount</p>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-bold text-foreground">
                        {withdrawal.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <UsdtIcon className="w-8 h-8" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">Amount requested to be withdrawn</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal Details */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* User Name */}
                  <div>
                    <Label className="text-muted-foreground">User Name</Label>
                    <p className="text-foreground font-medium mt-1">{withdrawal.full_name}</p>
                  </div>

                  {/* User ID */}
                  <div>
                    <Label className="text-muted-foreground">User ID</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono">{withdrawal.user_id}</code>
                      <button
                        onClick={() => handleCopy(withdrawal.user_id.toString(), "userId")}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Copy user ID"
                      >
                        {copiedField === "userId" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-foreground font-medium mt-1">{withdrawal.email}</p>
                  </div>

                  {/* Amount */}
                  <div>
                    <Label className="text-muted-foreground">Amount (USDT)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-foreground font-bold text-lg">
                        {withdrawal.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <UsdtIcon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Chain */}
                  <div>
                    <Label className="text-muted-foreground">Chain</Label>
                    <Badge variant="outline" className="mt-1 font-mono">
                      {withdrawal.chain}
                    </Badge>
                  </div>

                  {/* Wallet Address */}
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">Wallet Address</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono flex-1 truncate">
                        {withdrawal.wallet_address}
                      </code>
                      <button
                        onClick={() => handleCopy(withdrawal.wallet_address, "wallet")}
                        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                        aria-label="Copy wallet address"
                      >
                        {copiedField === "wallet" ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Transaction Hash */}
                  {withdrawal.tx_hash && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Transaction Hash</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-muted px-3 py-1.5 rounded font-mono flex-1 truncate">
                          {withdrawal.tx_hash}
                        </code>
                        <button
                          onClick={() => handleCopy(withdrawal.tx_hash!, "txHash")}
                          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          aria-label="Copy transaction hash"
                        >
                          {copiedField === "txHash" ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Request Date */}
                  <div className="md:col-span-2">
                    <Label className="text-muted-foreground">
                      {withdrawal.status === "pending" ? "Pending since" : "Submitted at"}
                    </Label>
                    <p className="text-foreground font-medium mt-1">
                      {formatRelativeTime(withdrawal.requested_at)} - {format(new Date(withdrawal.requested_at), "PPpp")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rejection Reason */}
            {withdrawal.rejection_reason && (
              <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                <CardHeader>
                  <CardTitle className="text-red-900 dark:text-red-100">Rejection Reason</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-800 dark:text-red-200">{withdrawal.rejection_reason}</p>
                </CardContent>
              </Card>
            )}

            {/* Admin Notes */}
            {withdrawal.admin_notes && (
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-blue-900 dark:text-blue-100">Admin Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-800 dark:text-blue-200">{withdrawal.admin_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Decision Panel - Only for Pending */}
            {withdrawal.status === "pending" && (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle>Review Decision</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button
                    onClick={() => setShowApproveModal(true)}
                    className="bg-green-600 text-white hover:bg-green-700"
                    size="lg"
                  >
                    Approve & Enter TX Hash
                  </Button>
                  <Button
                    onClick={() => setShowRejectModal(true)}
                    variant="destructive"
                    size="lg"
                  >
                    Reject Withdrawal
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Processing History */}
            {withdrawal.processed_at && (
              <Card>
                <CardHeader>
                  <CardTitle>Processing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Processed at: {format(new Date(withdrawal.processed_at), "PPpp")}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Approve Modal */}
            <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Withdrawal</DialogTitle>
                  <DialogDescription>
                    Enter the transaction hash after sending the funds to the user's wallet address.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionId">Transaction Hash *</Label>
                    <Input
                      id="transactionId"
                      placeholder="Enter transaction hash"
                      value={transactionIdInput}
                      onChange={(e) => setTransactionIdInput(e.target.value)}
                      disabled={isSubmitting}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                    <Textarea
                      id="adminNotes"
                      placeholder="Add any notes about the processing..."
                      value={adminNotesInput}
                      onChange={(e) => setAdminNotesInput(e.target.value)}
                      disabled={isSubmitting}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApproveModal(false);
                      setTransactionIdInput("");
                      setAdminNotesInput("");
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={!transactionIdInput.trim() || isSubmitting}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {isSubmitting ? "Processing..." : "Approve Withdrawal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Reject Modal */}
            <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reject Withdrawal</DialogTitle>
                  <DialogDescription>
                    Please provide a reason for rejecting this withdrawal. The funds will be refunded to the user's account.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                    <Textarea
                      id="rejectionReason"
                      placeholder="Enter the reason for rejection..."
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      disabled={isSubmitting}
                      rows={4}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReasonInput("");
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={!rejectionReasonInput.trim() || isSubmitting}
                    variant="destructive"
                  >
                    {isSubmitting ? "Processing..." : "Reject Withdrawal"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}