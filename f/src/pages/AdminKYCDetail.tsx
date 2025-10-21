import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Copy,
  Download,
  Eye,
  Check,
  X,
  ChevronRight,
  FileCheck,
  User,
  Mail,
  Phone,
  Calendar,
  Hash,
  CreditCard,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { adminKYCAPI, AdminKYCSubmission } from "@/services/api";

export default function AdminKYCDetail() {
  const navigate = useNavigate();
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState<AdminKYCSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (submissionId) {
      loadKYCSubmission();
    }
  }, [submissionId]);

  const loadKYCSubmission = async () => {
    try {
      setIsLoading(true);
      const data = await adminKYCAPI.getKYCById(submissionId!);
      setSubmission(data);
    } catch (error: any) {
      console.error('Failed to load KYC submission:', error);
      toast.error(error.message || 'Failed to load KYC submission');
      navigate('/admin/dashboard/kyc');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    if (submission) {
      navigator.clipboard.writeText(submission.user_id.toString());
      setCopiedId(true);
      toast.success("User ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleApprove = async () => {
    if (!submission) return;
    
    setIsProcessing(true);
    try {
      await adminKYCAPI.approveKYC(submission.id.toString());
      toast.success("KYC submission approved successfully");
      setShowApproveDialog(false);
      // Reload the submission to get updated status
      await loadKYCSubmission();
    } catch (error: any) {
      console.error('Failed to approve KYC:', error);
      toast.error(error.message || 'Failed to approve KYC submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!submission) return;
    
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setIsProcessing(true);
    try {
      await adminKYCAPI.rejectKYC(submission.id.toString(), rejectReason);
      toast.success("KYC submission rejected");
      setShowRejectDialog(false);
      setRejectReason("");
      // Reload the submission to get updated status
      await loadKYCSubmission();
    } catch (error: any) {
      console.error('Failed to reject KYC:', error);
      toast.error(error.message || 'Failed to reject KYC submission');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (url: string, filename: string) => {
    // Open in new tab (R2 URLs should be publicly accessible)
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.click();
    toast.success(`Opening ${filename}`);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDocumentType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading KYC submission...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!submission) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">KYC Submission Not Found</h3>
              <Button onClick={() => navigate('/admin/dashboard/kyc')}>
                Back to KYC List
              </Button>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

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
                onClick={() => navigate("/admin/dashboard/kyc")}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                KYC
              </button>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground font-semibold">{submission.full_name}</span>
            </nav>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Back Button */}
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/dashboard/kyc")}
                className="hover:bg-accent/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to KYC List
              </Button>

              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <FileCheck className="h-8 w-8 text-primary" />
                    <div>
                      <h1 className="text-3xl font-bold text-foreground">{submission.full_name}</h1>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm font-mono text-muted-foreground">
                          USR{submission.user_id}
                        </code>
                        <button
                          onClick={handleCopyId}
                          className="p-1 hover:bg-accent/10 rounded transition-colors"
                        >
                          {copiedId ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-4 py-2 text-base ${getStatusBadgeVariant(
                      submission.status
                    )}`}
                  >
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Summary Panel */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Submission Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">User ID</p>
                          <p className="font-semibold text-foreground">USR{submission.user_id}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Full Name</p>
                          <p className="font-semibold text-foreground">{submission.full_name}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-semibold text-foreground">{submission.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-semibold text-foreground">{submission.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Document Type</p>
                          <p className="font-semibold text-foreground">{formatDocumentType(submission.document_type)}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Document Number</p>
                          <p className="font-semibold text-foreground">{submission.document_number}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Submission Date</p>
                          <p className="font-semibold text-foreground">
                            {formatDate(submission.submitted_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <FileCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Status</p>
                          <Badge
                            variant="outline"
                            className={`${getStatusBadgeVariant(submission.status)} mt-1`}
                          >
                            {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5 text-primary" />
                    Submitted Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Document Front */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Document Front</h4>
                      <div className="relative group">
                        <img
                          src={submission.document_front_url}
                          alt="Document Front"
                          className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer"
                          onClick={() => setSelectedImage(submission.document_front_url)}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedImage(submission.document_front_url)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleDownload(submission.document_front_url, "document-front.jpg")
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Document Back (if exists) */}
                    {submission.document_back_url && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Document Back</h4>
                        <div className="relative group">
                          <img
                            src={submission.document_back_url}
                            alt="Document Back"
                            className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer"
                            onClick={() => setSelectedImage(submission.document_back_url!)}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedImage(submission.document_back_url!)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                handleDownload(submission.document_back_url!, "document-back.jpg")
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Selfie */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Selfie Photo</h4>
                      <div className="relative group">
                        <img
                          src={submission.selfie_url}
                          alt="Selfie"
                          className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer"
                          onClick={() => setSelectedImage(submission.selfie_url)}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedImage(submission.selfie_url)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleDownload(submission.selfie_url, "selfie.jpg")
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Decision Panel - Only show for pending submissions */}
              {submission.status === "pending" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Decision</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                          onClick={() => setShowApproveDialog(true)}
                          className="flex-1 bg-green-600 text-white hover:bg-green-700"
                          disabled={isProcessing}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve KYC
                        </Button>
                        <Button
                          onClick={() => setShowRejectDialog(true)}
                          variant="destructive"
                          className="flex-1"
                          disabled={isProcessing}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject KYC
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Decision History - Only show for processed submissions */}
              {submission.status !== "pending" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Decision History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Processed By</p>
                          <p className="font-semibold text-foreground">
                            Admin User ID: {submission.reviewed_by || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Decision Date</p>
                          <p className="font-semibold text-foreground">
                            {formatDate(submission.reviewed_at)}
                          </p>
                        </div>
                      </div>

                      {submission.rejection_reason && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Rejection Reason</p>
                          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                            <p className="text-foreground">{submission.rejection_reason}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>

        {/* Approve Confirmation Dialog */}
        <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve KYC Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this KYC submission for {submission.full_name}? This
                action will grant the user full access to the platform.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Approve"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog */}
        <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject KYC Submission</AlertDialogTitle>
              <AlertDialogDescription>
                Please provide a reason for rejecting this KYC submission. This will be communicated
                to the user.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Provide reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px]"
                disabled={isProcessing}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReject}
                disabled={isProcessing}
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Reject"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Image Preview Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-6xl w-full relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <img
                src={selectedImage}
                alt="Document Preview"
                className="w-full h-auto rounded-lg max-h-[90vh] object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}