import { useState, useEffect } from "react";
import { ArrowDownToLine, AlertCircle, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import UsdtIcon from "@/components/ui/usdt-icon";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { apiService, UserBalance } from "@/services/api";

const Withdraw = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [chain, setChain] = useState<string>("TRC20");
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [walletAddressError, setWalletAddressError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  // State for user balance
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);

  // Load user balance on component mount
  useEffect(() => {
    loadUserBalance();
  }, []);

  const loadUserBalance = async () => {
    try {
      setIsLoading(true);
      const balanceResponse = await apiService.getUserBalance();
      if (balanceResponse.accounts && balanceResponse.accounts.length > 0) {
        setUserBalance(balanceResponse.accounts[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load balance. Please refresh the page.",
        variant: "destructive",
      });
      console.error('Failed to load balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const availableBalance = userBalance?.available_balance || 0;

  const validateForm = (): boolean => {
    let isValid = true;
    
    // Clear previous errors
    setAmountError(null);
    setWalletAddressError(null);
    setTermsError(null);

    // Amount validation
    const numAmount = parseFloat(amount);
    if (!amount || amount.trim() === "") {
      setAmountError("Please enter an amount");
      isValid = false;
    } else if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError("Amount must be greater than 0");
      isValid = false;
    } else if (numAmount < 10) {
      setAmountError("Minimum withdrawal amount is 10 USDT");
      isValid = false;
    } else if (numAmount > availableBalance) {
      setAmountError("Amount exceeds available balance");
      isValid = false;
    }

    // Wallet address validation
    if (!walletAddress || walletAddress.trim() === "") {
      setWalletAddressError("Please enter wallet address");
      isValid = false;
    } else {
      // Basic format validation
      if (chain === 'TRC20') {
        if (!walletAddress.match(/^T[a-zA-Z0-9]{33}$/)) {
          setWalletAddressError("Invalid TRC20 address format (should start with T and be 34 characters)");
          isValid = false;
        }
      } else if (chain === 'BEP20') {
        if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          setWalletAddressError("Invalid BEP20 address format (should start with 0x and be 42 characters)");
          isValid = false;
        }
      }
    }

    // Terms validation
    if (!termsAccepted) {
      setTermsError("You must accept the terms to continue");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Set submitting state
    setIsSubmitting(true);

    try {
      // Prepare withdrawal data
      const withdrawalData = {
        amount: parseFloat(amount),
        chain: chain as 'TRC20' | 'BEP20',
        wallet_address: walletAddress,
      };

      console.log("Withdrawal Data:", withdrawalData);

      // Call API
      await apiService.requestWithdrawal(withdrawalData);

      // Show success toast
      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request has been submitted successfully. Admin will review within 24-48 hours.",
      });

      // Clear form
      setAmount("");
      setWalletAddress("");
      setChain("TRC20");
      setTermsAccepted(false);

      // Refresh balance
      loadUserBalance();

      // Navigate to history after short delay
      setTimeout(() => {
        navigate("/withdraw/history");
      }, 2000);

    } catch (error: any) {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "Failed to submit withdrawal request. Please try again.",
        variant: "destructive",
      });
      console.error("Withdrawal error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = 
    amount !== "" &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= availableBalance &&
    parseFloat(amount) >= 10 &&
    walletAddress !== "" &&
    walletAddress.length >= 10 &&
    termsAccepted &&
    !isSubmitting;

  // Show loading state
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <SidebarInset className="flex-1">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading balance...</p>
                </div>
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
            <div className="flex h-16 items-center gap-4 px-4 md:px-6">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-xl font-semibold">Withdraw</h1>
              <div className="ml-auto">
                <Button variant="outline" onClick={() => navigate("/withdraw/history")}>
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Button>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-8 max-w-4xl">

            {/* Available Balance Card */}
            <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <ArrowDownToLine className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">Available for Withdrawal</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-3xl font-bold">{availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <UsdtIcon className="w-8 h-8" />
                    </div>
                    <p className="text-xs text-muted-foreground">Amount available to withdraw</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal Request Form */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle>Request Withdrawal</CardTitle>
                <CardDescription>Submit a withdrawal request for admin approval</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Withdrawal Amount</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onBlur={validateForm}
                        className={`pr-16 ${amountError ? 'border-red-500' : ''}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <UsdtIcon className="w-5 h-5" />
                        <span className="text-sm text-foreground/70">USDT</span>
                      </div>
                    </div>
                    {amountError && (
                      <p className="text-xs text-red-500">{amountError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Available: {availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                    </p>
                  </div>

                  {/* Wallet Address Input */}
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress">Destination Wallet Address</Label>
                    <Input
                      id="walletAddress"
                      type="text"
                      placeholder={chain === 'TRC20' ? 'Enter TRC20 address (T...)' : 'Enter BEP20 address (0x...)'}
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      onBlur={validateForm}
                      className={walletAddressError ? 'border-red-500' : ''}
                    />
                    {walletAddressError && (
                      <p className="text-xs text-red-500">{walletAddressError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Enter the wallet address where you want to receive funds
                    </p>
                  </div>

                  {/* Network Selection */}
                  <div className="space-y-3">
                    <Label>Blockchain Network</Label>
                    <RadioGroup value={chain} onValueChange={setChain}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          htmlFor="trc20"
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            chain === "TRC20"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value="TRC20" id="trc20" />
                          <div>
                            <p className="font-medium">TRC20</p>
                            <p className="text-xs text-muted-foreground">TRON</p>
                          </div>
                        </label>

                        <label
                          htmlFor="bep20"
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            chain === "BEP20"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value="BEP20" id="bep20" />
                          <div>
                            <p className="font-medium">BEP20</p>
                            <p className="text-xs text-muted-foreground">Binance Smart Chain</p>
                          </div>
                        </label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-muted-foreground">
                      Ensure your wallet supports this network
                    </p>
                  </div>

                  {/* Important Notice Box */}
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-semibold text-blue-900 dark:text-blue-100">Important:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Withdrawal requests require admin approval. Funds will be deducted from your balance immediately and held until approved. Processing time: 24-48 hours.
                        </p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          If rejected, funds will be automatically refunded to your account.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="terms"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                      />
                      <label
                        htmlFor="terms"
                        className="text-sm leading-relaxed cursor-pointer"
                      >
                        I confirm the wallet address is correct and I understand funds will be deducted immediately upon submission
                      </label>
                    </div>
                    {termsError && (
                      <p className="text-xs text-red-500">{termsError}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={!isFormValid}
                  >
                    {isSubmitting ? "Submitting Request..." : "Request Withdrawal"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Withdraw;