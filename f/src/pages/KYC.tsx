import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiService, KYCSubmission } from "@/services/api";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Clock, CheckCircle, XCircle, AlertCircle, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

interface FileUpload {
  file: File;
  preview?: string;
}

export default function KYC() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // KYC status from API
  const [kycSubmission, setKycSubmission] = useState<KYCSubmission | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  
  // Form state
  const [documentType, setDocumentType] = useState<"passport" | "national_id">("passport");
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentFront, setDocumentFront] = useState<FileUpload | null>(null);
  const [documentBack, setDocumentBack] = useState<FileUpload | null>(null);
  const [selfie, setSelfie] = useState<FileUpload | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch KYC status on component mount
  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const submission = await apiService.getKYCStatus();
      setKycSubmission(submission);
    } catch (error: any) {
      console.error('Failed to fetch KYC status:', error);
      // Don't show error for no submission found (404)
      if (!error.message.includes('404')) {
        toast({
          title: "Error",
          description: "Failed to load KYC status. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleFileUpload = (
    file: File,
    setter: (upload: FileUpload | null) => void,
    maxSize: number,
    allowedTypes: string[],
    fieldName: string
  ) => {
    // Validate file type
    const fileExtension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!allowedTypes.includes(fileExtension)) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: `File type not supported. Please upload ${allowedTypes.join(", ").toUpperCase()}`
      }));
      return;
    }

    // Validate file size (convert to MB)
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: `File size too large. Maximum size is ${maxSize}MB`
      }));
      return;
    }

    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setter({ file });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (
    e: React.DragEvent,
    setter: (upload: FileUpload | null) => void,
    maxSize: number,
    allowedTypes: string[],
    fieldName: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0], setter, maxSize, allowedTypes, fieldName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    if (!documentNumber.trim()) {
      newErrors.documentNumber = "Please enter a valid document number";
    }
    
    if (!documentFront) {
      newErrors.documentFront = "Document front is required";
    }
    
    if (!selfie) {
      newErrors.selfie = "Selfie is required";
    }
    
    if (!termsAccepted) {
      newErrors.terms = "You must confirm that all information is accurate";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submission = await apiService.submitKYC({
        document_type: documentType,
        document_number: documentNumber,
        document_front: documentFront!.file,
        document_back: documentBack?.file,
        selfie: selfie!.file,
      });

      // Update local state with new submission
      setKycSubmission(submission);
      
      // Clear form
      setDocumentType("passport");
      setDocumentNumber("");
      setDocumentFront(null);
      setDocumentBack(null);
      setSelfie(null);
      setTermsAccepted(false);
      setErrors({});
      
      // Show success message
      toast({
        title: "Success!",
        description: "KYC application submitted successfully! We'll review your documents within 24-48 hours.",
      });
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to submit KYC application. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("KYC submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const renderStatusCard = () => {
    if (isLoadingStatus) {
      return (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <div>Loading KYC status...</div>
            </div>
          </CardHeader>
        </Card>
      );
    }

    if (kycSubmission?.status === "pending") {
      return (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-yellow-500/20">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>KYC Verification Pending</CardTitle>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                    PENDING
                  </Badge>
                </div>
                <CardDescription className="text-yellow-200/80">
                  Your documents are under review. This usually takes 24-48 hours.
                </CardDescription>
                <p className="text-sm text-muted-foreground mt-2">
                  Submitted: {getTimeAgo(kycSubmission.submitted_at)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    }
    
    if (kycSubmission?.status === "approved") {
      return (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>KYC Verified</CardTitle>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/30">
                    APPROVED
                  </Badge>
                </div>
                <CardDescription className="text-green-200/80">
                  Your identity has been verified. You can now access all features.
                </CardDescription>
                {kycSubmission.reviewed_at && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Approved: {getTimeAgo(kycSubmission.reviewed_at)}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    }
    
    if (kycSubmission?.status === "rejected") {
      return (
        <Card className="border-red-500/50 bg-red-500/10">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle>KYC Verification Rejected</CardTitle>
                  <Badge variant="secondary" className="bg-red-500/20 text-red-500 border-red-500/30">
                    REJECTED
                  </Badge>
                </div>
                <CardDescription className="text-red-200/80">
                  Your submission was rejected. Please review the reason below and resubmit.
                </CardDescription>
                {kycSubmission.rejection_reason && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
                    <p className="text-sm font-medium text-red-300">Rejection Reason:</p>
                    <p className="text-sm text-red-200 mt-1">{kycSubmission.rejection_reason}</p>
                  </div>
                )}
                <Button
                  onClick={() => setKycSubmission(null)}
                  variant="outline"
                  className="mt-4 border-red-500/50 text-red-500 hover:bg-red-500/20"
                >
                  Resubmit Documents
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      );
    }
    
    return (
      <Card className="border-muted bg-muted/10">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-muted/20">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>Complete Your KYC Verification</CardTitle>
                <Badge variant="secondary">NOT STARTED</Badge>
              </div>
              <CardDescription>
                Please submit your documents to verify your identity and unlock all features.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  const renderFileUploadBox = (
    file: FileUpload | null,
    setter: (upload: FileUpload | null) => void,
    fieldName: string,
    maxSize: number,
    allowedTypes: string[],
    label: string,
    helpText: string,
    isOptional = false
  ) => {
    const error = errors[fieldName];
    
    if (file) {
      return (
        <div className="border border-primary/30 rounded-lg p-4 bg-primary/5">
          <div className="flex items-center gap-3">
            {file.preview ? (
              <img src={file.preview} alt="Preview" className="h-16 w-16 object-cover rounded" />
            ) : (
              <div className="p-3 rounded bg-primary/20">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setter(null)}
              className="hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, setter, maxSize, allowedTypes, fieldName)}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer hover:border-primary/50 ${
          error ? "border-destructive/50 bg-destructive/5" : "border-muted-foreground/30"
        }`}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = allowedTypes.join(",");
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              handleFileUpload(file, setter, maxSize, allowedTypes, fieldName);
            }
          };
          input.click();
        }}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground">
          {allowedTypes.map(t => t.toUpperCase().replace(".", "")).join(", ")} (max {maxSize}MB)
        </p>
      </div>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-primary/5">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-background/80 backdrop-blur-sm border-b border-border">
            <SidebarTrigger className="lg:hidden" />
            <h1 className="text-xl font-semibold flex-1">KYC Verification</h1>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Status Card */}
              {renderStatusCard()}

              {/* Submission Form - Show only if not approved */}
              {kycSubmission?.status !== "approved" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Submit Identity Documents</CardTitle>
                    <CardDescription>
                      Please provide the following information and documents for verification
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Document Type */}
                      <div className="space-y-2">
                        <Label htmlFor="documentType">Document Type</Label>
                        <Select value={documentType} onValueChange={(value: "passport" | "national_id") => setDocumentType(value)}>
                          <SelectTrigger id="documentType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="passport">Passport</SelectItem>
                            <SelectItem value="national_id">National ID Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Document Number */}
                      <div className="space-y-2">
                        <Label htmlFor="documentNumber">Document Number</Label>
                        <Input
                          id="documentNumber"
                          placeholder="Enter your document/ID number"
                          value={documentNumber}
                          onChange={(e) => setDocumentNumber(e.target.value)}
                          maxLength={100}
                          className={errors.documentNumber ? "border-destructive" : ""}
                          disabled={isSubmitting}
                        />
                        {errors.documentNumber && (
                          <p className="text-sm text-destructive">{errors.documentNumber}</p>
                        )}
                      </div>

                      {/* Document Front */}
                      <div className="space-y-2">
                        <Label>Document Front Side</Label>
                        <p className="text-sm text-muted-foreground">
                          Upload a clear photo of the FRONT of your selected document. All four corners must be visible and text must be readable.
                        </p>
                        {renderFileUploadBox(
                          documentFront,
                          setDocumentFront,
                          "documentFront",
                          5,
                          [".jpg", ".jpeg", ".png", ".pdf"],
                          "Document Front",
                          ""
                        )}
                        {errors.documentFront && (
                          <p className="text-sm text-destructive">{errors.documentFront}</p>
                        )}
                      </div>

                      {/* Document Back (Optional) */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label>Document Back Side</Label>
                          <Badge variant="secondary">Optional</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload the BACK side of your document if applicable. For national IDs, please upload the back side if it contains information.
                        </p>
                        {renderFileUploadBox(
                          documentBack,
                          setDocumentBack,
                          "documentBack",
                          5,
                          [".jpg", ".jpeg", ".png", ".pdf"],
                          "Document Back",
                          "",
                          true
                        )}
                        {errors.documentBack && (
                          <p className="text-sm text-destructive">{errors.documentBack}</p>
                        )}
                      </div>

                      {/* Selfie */}
                      <div className="space-y-2">
                        <Label>Selfie with Document</Label>
                        <p className="text-sm text-muted-foreground">
                          Upload a selfie holding your document next to your face. Ensure your face and the document are both clearly visible with good lighting.
                        </p>
                        {renderFileUploadBox(
                          selfie,
                          setSelfie,
                          "selfie",
                          5,
                          [".jpg", ".jpeg", ".png"],
                          "Selfie",
                          ""
                        )}
                        {errors.selfie && (
                          <p className="text-sm text-destructive">{errors.selfie}</p>
                        )}
                      </div>

                      {/* Terms Checkbox */}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                          disabled={isSubmitting}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="terms" className="cursor-pointer text-sm leading-relaxed">
                            I confirm that all information provided is accurate and the documents are authentic
                          </Label>
                          {errors.terms && (
                            <p className="text-sm text-destructive">{errors.terms}</p>
                          )}
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={
                          !documentType ||
                          !documentNumber.trim() ||
                          !documentFront ||
                          !selfie ||
                          !termsAccepted ||
                          isSubmitting ||
                          (kycSubmission?.status === "pending")
                        }
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit KYC Application"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}