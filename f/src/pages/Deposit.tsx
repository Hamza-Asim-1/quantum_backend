// frontend/src/pages/Deposit.tsx
import { useState, useEffect } from "react";
import { ArrowUpToLine, Copy, CheckCircle2, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import UsdtIcon from "@/components/ui/usdt-icon";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiService } from "@/services/api";

const Deposit = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [amount, setAmount] = useState<string>("");
  const [network, setNetwork] = useState<string>("TRC20");
  const [txId, setTxId] = useState<string>("");
  const [walletAddress, setWalletAddress] = useState<string>("");
  
  // UI state
  const [showProcessModal, setShowProcessModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState<boolean>(true);
  
  // Validation state
  const [amountError, setAmountError] = useState<string | null>(null);
  
  // Platform addresses
  const [platformAddresses, setPlatformAddresses] = useState<{
    BEP20: string;
    TRC20: string;
  } | null>(null);

  const depositAddress = platformAddresses 
    ? (network === "TRC20" ? platformAddresses.TRC20 : platformAddresses.BEP20)
    : "";

  // Load platform addresses on mount
  useEffect(() => {
    loadPlatformAddresses();
  }, []);

  const loadPlatformAddresses = async () => {
    try {
      setIsLoadingAddresses(true);
      const data = await apiService.getPlatformAddresses();
      setPlatformAddresses(data.addresses);
    } catch (error: any) {
      console.error('Failed to load platform addresses:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load deposit addresses. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const validateAmount = (): boolean => {
    const numAmount = parseFloat(amount);
    if (!amount || amount.trim() === "") {
      setAmountError("Please enter an amount");
      return false;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setAmountError("Amount must be greater than 0");
      return false;
    }
    if (numAmount < 10) {
      setAmountError("Minimum deposit amount is 10 USDT");
      return false;
    }
    const decimals = amount.split(".")[1];
    if (decimals && decimals.length > 2) {
      setAmountError("Amount can have maximum 2 decimal places");
      return false;
    }
    setAmountError(null);
    return true;
  };

  const handleAmountBlur = () => {
    if (amount) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount)) {
        setAmount(numAmount.toFixed(2));
      }
    }
    validateAmount();
  };

  const handleCopyAddress = async () => {
    if (depositAddress) {
      try {
        await navigator.clipboard.writeText(depositAddress);
        setCopied(true);
        toast({
          title: "Address Copied",
          description: "Deposit address copied to clipboard",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast({
          title: "Copy Failed",
          description: "Failed to copy address",
          variant: "destructive",
        });
      }
    }
  };

  const handleProceedToTxId = () => {
    if (!validateAmount()) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }
    if (!network) {
      toast({
        title: "Validation Error",
        description: "Please select a network",
        variant: "destructive",
      });
      return;
    }
    setShowProcessModal(true);
  };

  const handleSubmitTxId = async () => {
    if (!txId.trim()) {
      toast({
        title: "Error",
        description: "Please enter transaction hash",
        variant: "destructive",
      });
      return;
    }

    // Basic tx hash validation
    if (network === "TRC20" && txId.length < 64) {
      toast({
        title: "Invalid Transaction Hash",
        description: "TRC20 transaction hash should be 64 characters long",
        variant: "destructive",
      });
      return;
    }

    if (network === "BEP20" && (!txId.startsWith("0x") || txId.length !== 66)) {
      toast({
        title: "Invalid Transaction Hash",
        description: "BEP20 transaction hash should start with 0x and be 66 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const depositData = {
        amount: parseFloat(amount),
        chain: network as 'TRC20' | 'BEP20',
        tx_hash: txId,
        wallet_address: walletAddress || undefined,
      };

      await apiService.submitDeposit(depositData);

      toast({
        title: "Deposit Submitted Successfully!",
        description: "Your deposit will be confirmed automatically within 5-10 minutes after blockchain verification.",
      });

      // Reset form
      setAmount("");
      setNetwork("TRC20");
      setTxId("");
      setWalletAddress("");
      setShowProcessModal(false);

      // Navigate to history
      setTimeout(() => {
        navigate("/deposit/history");
      }, 2000);

    } catch (error: any) {
      console.error("Deposit submission error:", error);
      
      toast({
        title: "Deposit Failed",
        description: error.message || "Failed to submit deposit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    if (!amount || parseFloat(amount) < 10 || !network || amountError) {
      return false;
    }
    return true;
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
                    {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg">
            <div className="flex h-16 items-center gap-4 px-4 md:px-6">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-xl font-semibold">Deposit</h1>
              <div className="ml-auto">
                <Button variant="outline" onClick={() => navigate("/deposit/history")}>
                  <History className="mr-2 h-4 w-4" />
                  View History
                </Button>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-8 max-w-4xl">

            {/* Instructions Card */}
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-blue-900 mb-2">How to Deposit:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>Enter the amount you want to deposit</li>
                  <li>Select your preferred blockchain network (TRC20 or BEP20)</li>
                  <li>Copy the platform wallet address shown below</li>
                  <li>Send USDT from your wallet to this address</li>
                  <li>After sending, enter your transaction hash to complete the deposit</li>
                  <li>Your deposit will be automatically confirmed within 5-10 minutes</li>
                </ol>
              </CardContent>
            </Card>

            {/* Deposit Form */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle>Add Funds</CardTitle>
                <CardDescription>Deposit USDT to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Deposit Amount</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="10"
                        placeholder="Enter amount (minimum 10 USDT)"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setAmountError(null);
                        }}
                        onBlur={handleAmountBlur}
                        className={`pr-12 ${amountError ? "border-red-500" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <UsdtIcon className="w-5 h-5" />
                      </div>
                    </div>
                    {amountError && <p className="text-xs text-red-500">{amountError}</p>}
                    <p className="text-xs text-muted-foreground">Minimum deposit: 10 USDT</p>
                  </div>

                  {/* Network Selection */}
                  <div className="space-y-3">
                    <Label>Blockchain Network</Label>
                    <RadioGroup value={network} onValueChange={setNetwork}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          htmlFor="trc20"
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            network === "TRC20"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value="TRC20" id="trc20" />
                          <div>
                            <p className="font-medium">TRC20</p>
                            <p className="text-xs text-muted-foreground">TRON Network</p>
                          </div>
                        </label>

                        <label
                          htmlFor="bep20"
                          className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                            network === "BEP20"
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
                  </div>

                  {/* Deposit Address */}
                  {network && (
                    <div className="space-y-2">
                      <Label htmlFor="depositAddress">Platform Deposit Address</Label>
                      {isLoadingAddresses ? (
                        <div className="h-10 bg-muted animate-pulse rounded-md" />
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <Input
                              id="depositAddress"
                              type="text"
                              value={depositAddress}
                              readOnly
                              className="font-mono text-sm bg-muted"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={handleCopyAddress}
                              className="flex-shrink-0"
                            >
                              {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                            <p className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                              ⚠️ Important: Send only USDT on the {network} network to this address. Sending any other token or using wrong network will result in loss of funds.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Your Wallet Address (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="walletAddress">Your Wallet Address (Optional)</Label>
                    <Input
                      id="walletAddress"
                      type="text"
                      placeholder="Enter your wallet address (from which you're sending)"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      The wallet address from which you're sending USDT (helps with verification)
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    disabled={!isFormValid() || isLoadingAddresses}
                    onClick={handleProceedToTxId}
                  >
                    <ArrowUpToLine className="mr-2 h-5 w-5" />
                    Proceed to Enter Transaction Hash
                  </Button>

                  {/* Info Box */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Next step:</strong> After clicking the button above, you'll be asked to enter your transaction hash. Make sure you've already sent the USDT before entering the hash.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </div>

      {/* Transaction ID Modal */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Enter Transaction Hash</DialogTitle>
            <DialogDescription>
              Enter the transaction hash from your blockchain transaction. This will be used to verify your deposit automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label htmlFor="txid">Transaction Hash *</Label>
              <Input 
                id="txid" 
                value={txId} 
                onChange={(e) => setTxId(e.target.value)} 
                placeholder={
                  network === "TRC20" 
                    ? "64-character transaction hash" 
                    : "0x... (66-character transaction hash)"
                }
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                You can find the transaction hash in your wallet app after sending USDT. It's a unique identifier for your transaction.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                📋 Deposit Summary:
              </p>
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p><strong>Amount:</strong> {amount} USDT</p>
                <p><strong>Network:</strong> {network}</p>
                <p><strong>To Address:</strong> {depositAddress.slice(0, 10)}...{depositAddress.slice(-10)}</p>
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                ⚠️ Make sure:
              </p>
              <ul className="list-disc list-inside text-xs text-yellow-800 dark:text-yellow-200 mt-1 space-y-1">
                <li>The transaction hash is from the {network} network</li>
                <li>You've sent exactly {amount} USDT</li>
                <li>The transaction has been sent to: {depositAddress.slice(0, 15)}...</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowProcessModal(false);
                setTxId("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmitTxId} disabled={!txId || isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Deposit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Deposit;