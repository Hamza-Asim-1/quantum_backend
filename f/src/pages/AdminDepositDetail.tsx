// frontend/src/pages/AdminDepositDetail.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, ExternalLink, Menu, X, Loader2, CheckCircle, XCircle } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { adminDepositAPI, AdminDepositDetail as DepositDetailType } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const AdminDepositDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deposit, setDeposit] = useState<DepositDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Confirmation dialogs
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadDeposit();
    }
  }, [id]);

  const loadDeposit = async () => {
    try {
      setIsLoading(true);
      const data = await adminDepositAPI.getDepositById(id!);
      setDeposit(data);
    } catch (error: any) {
      console.error('Failed to load deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load deposit details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!deposit) return;

    try {
      setIsProcessing(true);
      await adminDepositAPI.confirmDeposit(deposit.id.toString(), adminNotes);
      
      toast({
        title: "Deposit Confirmed",
        description: "The deposit has been manually confirmed and credited to user's account",
      });

      setShowConfirmDialog(false);
      setAdminNotes("");
      
      // Reload deposit details
      await loadDeposit();
    } catch (error: any) {
      console.error('Failed to confirm deposit:', error);
      toast({
        title: "Confirmation Failed",
        description: error.message || "Failed to confirm deposit",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDeposit = async () => {
    if (!deposit || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);
      await adminDepositAPI.rejectDeposit(deposit.id.toString(), rejectionReason);
      
      toast({
        title: "Deposit Rejected",
        description: "The deposit has been rejected",
      });

      setShowRejectDialog(false);
      setRejectionReason("");
      
      // Reload deposit details
      await loadDeposit();
    } catch (error: any) {
      console.error('Failed to reject deposit:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject deposit",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast({
        title: "Copied!",
        description: `${fieldName} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const depositDate = new Date(date);
    const diffMs = now.getTime() - depositDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    return format(depositDate, "MMMM d, yyyy");
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="h-8 w-8 p-0"
      aria-label={`Copy ${field}`}
    >
      {copiedField === field ? (
        <Check className="w-4 h-4 text-green-600" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  const getBlockExplorerUrl = (txHash: string, chain: string) => {
    if (chain === 'TRC20') {
      return `https://tronscan.org/#/transaction/${txHash}`;
    } else if (chain === 'BEP20') {
      return `https://bscscan.com/tx/${txHash}`;
    }
    return '#';
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Deposit ID</h2>
          <Button onClick={() => navigate("/admin/dashboard/deposits")}>
            Back to Deposits
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50 flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading deposit details...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!deposit) {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-gray-50 flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Deposit Not Found</h2>
              <Button onClick={() => navigate("/admin/dashboard/deposits")}>
                Back to Deposits
              </Button>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex w-full">
        <AdminSidebar />

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin/dashboard/deposits")}
                  className="gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Deposits
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Deposit Details
                  </h1>
                  <p className="text-sm text-gray-600">#{deposit.id}</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Status Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Status</CardTitle>
                    <Badge
                      variant={deposit.status === "confirmed" ? "default" : "secondary"}
                      className={
                        deposit.status === "confirmed"
                          ? "bg-green-100 text-green-800 hover:bg-green-100 text-base px-4 py-1"
                          : deposit.status === "failed"
                          ? "bg-red-100 text-red-800 hover:bg-red-100 text-base px-4 py-1"
                          : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-base px-4 py-1"
                      }
                    >
                      {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Amount</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {deposit.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-xl text-gray-600">USDT</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Chain</p>
                      <Badge variant="outline" className="text-lg px-3 py-1">
                        {deposit.chain}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {deposit.status === "pending" && (
                    <div className="mt-6 flex gap-3">
                      <Button
                        onClick={() => setShowConfirmDialog(true)}
                        className="flex-1"
                        variant="default"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm Deposit
                      </Button>
                      <Button
                        onClick={() => setShowRejectDialog(true)}
                        className="flex-1"
                        variant="destructive"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Deposit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* User Information */}
              <Card>
                <CardHeader>
                  <CardTitle>User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Name</p>
                      <p className="font-medium text-gray-900">{deposit.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Email</p>
                      <p className="font-medium text-gray-900">{deposit.email}</p>
                    </div>
                  </div>
                  {deposit.phone && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="font-medium text-gray-900">{deposit.phone}</p>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <p className="text-sm text-gray-600 mb-2">User ID</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 rounded-md font-mono text-sm">
                        {deposit.user_id}
                      </code>
                      <CopyButton text={deposit.user_id.toString()} field="User ID" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deposit Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Deposit Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deposit.from_address && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">From Address</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-gray-50 rounded-md font-mono text-sm break-all">
                            {deposit.from_address}
                          </code>
                          <CopyButton text={deposit.from_address} field="From Address" />
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {deposit.to_address && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 mb-2">To Address (Platform)</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-gray-50 rounded-md font-mono text-sm break-all">
                            {deposit.to_address}
                            </code>
                          <CopyButton text={deposit.to_address} field="To Address" />
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 rounded-md font-mono text-sm break-all">
                        {deposit.tx_hash}
                      </code>
                      <div className="flex gap-1">
                        <CopyButton text={deposit.tx_hash} field="Transaction Hash" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label="View on block explorer"
                          title="View on block explorer"
                          onClick={() => window.open(getBlockExplorerUrl(deposit.tx_hash, deposit.chain), '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Submitted At</p>
                    <p className="font-medium text-gray-900" title={format(new Date(deposit.created_at), "PPpp")}>
                      {formatRelativeTime(deposit.created_at)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(deposit.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>

                  {deposit.verified_at && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-gray-600 mb-1">
                          {deposit.status === 'confirmed' ? 'Confirmed & Credited At' : 'Verified At'}
                        </p>
                        <p className="font-medium text-gray-900" title={format(new Date(deposit.verified_at), "PPpp")}>
                          {formatRelativeTime(deposit.verified_at)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {format(new Date(deposit.verified_at), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </>
                  )}

                  {deposit.status === 'pending' && (
                    <>
                      <Separator />
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-yellow-900 mb-1">
                          Awaiting Confirmation
                        </p>
                        <p className="text-sm text-yellow-700">
                          This deposit is pending verification. The cron job will automatically confirm it once verified on the blockchain, or you can manually confirm it above.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Admin Notes */}
              {deposit.admin_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Admin Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`${deposit.status === 'failed' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4`}>
                      <p className={`text-sm ${deposit.status === 'failed' ? 'text-red-900' : 'text-blue-900'}`}>
                        {deposit.admin_notes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deposit</DialogTitle>
            <DialogDescription>
              Manually confirm this deposit and credit {deposit.amount} USDT to user's account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add any notes about this manual confirmation..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> This will immediately credit the user's account and create a ledger entry. Only confirm if you've verified the transaction on the blockchain.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setAdminNotes("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDeposit}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Deposit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deposit</DialogTitle>
            <DialogDescription>
              Reject this deposit request. Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejecting this deposit..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className={!rejectionReason.trim() ? "border-red-500" : ""}
              />
              {!rejectionReason.trim() && (
                <p className="text-xs text-red-500">Rejection reason is required</p>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-900">
                <strong>Warning:</strong> This action will mark the deposit as failed. The user will be able to see the rejection reason.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectDeposit}
              disabled={isProcessing || !rejectionReason.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Deposit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminDepositDetail;