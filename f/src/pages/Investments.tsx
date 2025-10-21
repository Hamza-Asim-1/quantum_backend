import { Wallet, Check, History, AlertCircle } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger,SidebarInset } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import UsdtIcon from "@/components/ui/usdt-icon";
import { apiService, InvestmentLevel, UserBalance, Investment } from "@/services/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const Investments = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  // State
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data state
  const [investmentLevels, setInvestmentLevels] = useState<InvestmentLevel[]>([]);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [kycStatus, setKycStatus] = useState<string>('pending');
  const [hasActiveInvestment, setHasActiveInvestment] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setKycStatus(user?.kyc_status || 'pending');
      
      // Load investment levels
      const levelsResponse = await apiService.getInvestmentLevels();
      setInvestmentLevels(levelsResponse.levels);

      // Load user balance
      const balanceResponse = await apiService.getUserBalance();
      if (balanceResponse.accounts && balanceResponse.accounts.length > 0) {
        setUserBalance(balanceResponse.accounts[0]);
      }

      // Check KYC status
      const kycResponse = await apiService.getKYCStatus();
      setKycStatus(kycResponse?.status || 'pending');

      // Check for active investment
      const currentInvestment = await apiService.getCurrentInvestment();
      setHasActiveInvestment(!!currentInvestment);

    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        title: "Error",
        description: "Failed to load investment data. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelInfo = (investmentAmount: number) => {
    return investmentLevels.find(level => 
      investmentAmount >= level.min_amount && 
      (level.max_amount === null || investmentAmount <= level.max_amount)
    );
  };

  const calculateDailyProfit = (investmentAmount: number) => {
    const levelInfo = getLevelInfo(investmentAmount);
    if (!levelInfo) return 0;
    return investmentAmount * (levelInfo.daily_rate / 100);
  };

  const getValidationMessage = () => {
    const numAmount = parseFloat(amount);
    const availableBalance = userBalance?.available_balance || 0;
    
    if (!amount) return "";
    if (isNaN(numAmount)) return "Please enter a valid number";
    if (numAmount < 100) return "Minimum investment is 100 USDT";
    if (numAmount > availableBalance) return "Amount exceeds available balance";
    return "";
  };

  const isFormValid = () => {
    const numAmount = parseFloat(amount);
    const availableBalance = userBalance?.available_balance || 0;
    
    return (
      amount &&
      !isNaN(numAmount) &&
      numAmount >= 100 &&
      numAmount <= availableBalance &&
      agreedToTerms &&
      !isSubmitting &&
      kycStatus === 'approved' &&
      !hasActiveInvestment
    );
  };

  const handleSelectPlan = (level: InvestmentLevel) => {
    // Use example amount or midpoint of range
    const exampleAmount = level.example_amount || level.min_amount;
    setAmount(exampleAmount.toString());
    setShowForm(true);
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;

    setIsSubmitting(true);

    try {
      const investmentData = {
        amount: parseFloat(amount),
      };

      const newInvestment = await apiService.createInvestment(investmentData);

      toast({
        title: "Investment Created Successfully!",
        description: `Your ${amount} USDT investment has been created. Profits will start from tomorrow.`,
      });

      // Reset form
      setAmount("");
      setAgreedToTerms(false);
      setShowForm(false);
      setHasActiveInvestment(true);

      // Refresh balance
      loadInitialData();

      // Navigate to my investments
      navigate("/investments/history");

    } catch (error: any) {
      toast({
        title: "Investment Creation Failed",
        description: error.message || "Failed to create investment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-6 md:p-8 flex items-center justify-center h-64">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading investment data...</p>
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  const availableBalance = userBalance?.available_balance || 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar />

        <main className="flex-1 overflow-auto">
          <div className="p-6 md:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                  Investments
                </h1>
                <p className="text-muted-foreground mt-2">Manage your investment portfolio</p>
              </div>
              <Button
                onClick={() => navigate("/investments/history")}
                variant="outline"
                className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
              >
                <History className="h-4 w-4" />
                View My Investments
              </Button>
            </div>

            {/* Alerts */}
            {kycStatus !== 'approved' && (
              <Alert className="border-orange-500/50 bg-orange-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  KYC verification is required before creating investments. 
                  {kycStatus === 'pending' && " Your KYC is currently under review."}
                  {kycStatus === 'rejected' && " Your KYC was rejected. Please resubmit."}
                  {kycStatus === 'not_submitted' && " Please complete your KYC verification."}
                </AlertDescription>
              </Alert>
            )}

            {hasActiveInvestment && (
              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You already have an active investment. Only one investment is allowed at a time.
                </AlertDescription>
              </Alert>
            )}

            {/* Available Balance Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-white/20 border border-border/30">
                    <Wallet className="h-6 w-6 text-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-foreground/70 font-normal">Available Balance</div>
                    <div className="flex items-center gap-2 mt-1">
                      <UsdtIcon className="w-8 h-8" />
                      <span className="text-4xl font-bold text-foreground">
                        {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-2xl text-foreground/70">USDT</span>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* <p className="text-sm text-foreground/60">Amount available for investment</p> */}
                {/* {userBalance?.invested_balance && userBalance.invested_balance > 0 && ( */}
                  <p className="text-sm text-foreground/60 mt-1">
                    Invested Amount: {userBalance.invested_balance.toLocaleString()} USDT
                  </p>
                {/* )} */}
              </CardContent>
            </Card>

            {/* Investment Plans Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Investment Plans</h2>
                <p className="text-muted-foreground mt-1">Choose a plan that suits your investment goals</p>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {investmentLevels.map((plan) => (
                  <Card
                    key={plan.level}
                    className={`
                      relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl
                      border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5
                      ${plan.level === 5 ? "border-primary/40 border-2" : ""}
                    `}
                  >
                    <CardHeader className="space-y-3">
                      <Badge
                        variant="outline"
                        className="w-fit text-xs font-bold bg-white/10 border-border/40 text-foreground"
                      >
                        LEVEL {plan.level}
                      </Badge>

                      <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>

                      <div className="flex items-center gap-2 text-foreground/70">
                        <UsdtIcon className="w-5 h-5" />
                        <span className="font-medium">{plan.range} USDT</span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="text-center py-4">
                        <div className="text-sm text-foreground/60 mb-1">Daily Profit Rate</div>
                        <div className="text-5xl font-bold text-primary">{plan.daily_rate}%</div>
                      </div>

                      <div className="p-3 rounded-lg bg-white/5 border border-border/30">
                        <p className="text-sm text-foreground/60 text-center">
                          Invest {plan.example_amount.toLocaleString()} → Earn {plan.example_daily_profit.toFixed(2)} daily
                        </p>
                      </div>

                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={kycStatus !== 'approved' || hasActiveInvestment}
                      >
                        Select Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Investment Creation Form */}
            {showForm && (
              <div ref={formRef} className="animate-fade-in w-full">
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 w-full">
                  <CardHeader>
                    <CardTitle className="text-2xl">Create New Investment</CardTitle>
                    <p className="text-muted-foreground mt-2">Fill in the details to create your investment</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Investment Amount */}
                      <div className="space-y-2">
                        <Label htmlFor="amount">Investment Amount</Label>
                        <div className="relative">
                          <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="pr-16"
                            min="100"
                            step="0.01"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <UsdtIcon className="w-5 h-5" />
                            <span className="text-sm text-foreground/70">USDT</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground/60">
                            Available: {availableBalance.toLocaleString()} USDT
                          </span>
                          {getValidationMessage() && (
                            <span className="text-destructive">{getValidationMessage()}</span>
                          )}
                          {amount && !getValidationMessage() && parseFloat(amount) >= 100 && (
                            <span className="text-green-600 flex items-center gap-1">
                              <Check className="w-4 h-4" /> Valid amount
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Investment Level Indicator */}
                      {amount && parseFloat(amount) >= 100 && (
                        <div className="space-y-2 animate-fade-in">
                          <Label>Your Investment Level</Label>
                          <div className="p-4 rounded-lg bg-white/10 border border-border/50">
                            {(() => {
                              const levelInfo = getLevelInfo(parseFloat(amount));
                              return levelInfo ? (
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="bg-white/10 border-border/40">
                                        LEVEL {levelInfo.level}
                                      </Badge>
                                      <span className="font-semibold">{levelInfo.name}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-primary">{levelInfo.daily_rate}%</div>
                                    <div className="text-xs text-foreground/60">daily rate</div>
                                  </div>
                                </div>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Daily Profit Calculator */}
                      {amount && parseFloat(amount) >= 100 && (
                        <div className="space-y-2 animate-fade-in">
                          <Label>Daily Profit Earnings</Label>
                          <div className="p-6 rounded-lg bg-primary/10 border border-primary/30 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <UsdtIcon className="w-8 h-8" />
                              <span className="text-4xl font-bold text-foreground">
                                {calculateDailyProfit(parseFloat(amount)).toFixed(2)}
                              </span>
                              <span className="text-xl text-foreground/70">USDT</span>
                            </div>
                            <div className="text-sm text-foreground/60">per day</div>
                          </div>
                        </div>
                      )}

                      {/* Terms Checkbox */}
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="terms"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        />
                        <Label
                          htmlFor="terms"
                          className="text-sm font-normal leading-relaxed cursor-pointer"
                        >
                          I understand the investment terms and will receive daily profit distributions starting tomorrow
                        </Label>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={!isFormValid()}
                      >
                        {isSubmitting ? "Creating Investment..." : "Create Investment"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Investments;