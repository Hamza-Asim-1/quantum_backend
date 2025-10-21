import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Calculator, TrendingUp } from "lucide-react";
import UsdtIcon from "@/components/ui/usdt-icon";

const RatesCalculator = () => {
  const [amount, setAmount] = useState<string>("1000");
  const [period, setPeriod] = useState<"daily" | "30days">("daily");
  const [compounding, setCompounding] = useState(false);

  const quickAmounts = [101, 1001, 3001, 6001, 10001];

  // Tiered rate logic
  const getTierRate = (amt: number): number => {
    if (amt >= 100 && amt <= 1000) return 0.003; // 0.3%
    if (amt >= 1001 && amt <= 3000) return 0.004; // 0.4%
    if (amt >= 3001 && amt <= 6000) return 0.005; // 0.5%
    if (amt >= 6001 && amt <= 10000) return 0.006; // 0.6%
    if (amt >= 10001) return 0.007; // 0.7%
    return 0;
  };

  const numAmount = parseFloat(amount) || 0;
  const rate = getTierRate(numAmount);
  const dailyReturn = numAmount * rate;

  let calculatedReturn = 0;
  if (period === "daily") {
    calculatedReturn = dailyReturn;
  } else {
    if (compounding) {
      // Compound: amount × ((1 + rate)^30 − 1)
      calculatedReturn = numAmount * (Math.pow(1 + rate, 30) - 1);
    } else {
      // Simple: daily × 30
      calculatedReturn = dailyReturn * 30;
    }
  }

  const handleQuickAmount = (amt: number) => {
    setAmount(amt.toString());
  };

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold">Calculate Your Returns</h2>
            <p className="text-muted-foreground">See how much you could earn with our tiered rate structure</p>
          </div>

          {/* Calculator Card */}
          <Card className="p-6 md:p-8 shadow-elevated border-primary/10 bg-card">
            <div className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-3">
                <Label htmlFor="amount" className="text-base font-semibold flex items-center gap-2">
                  Enter Amount <UsdtIcon />
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-lg h-12"
                  min="100"
                />

                {/* Quick Amount Chips */}
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map((amt) => (
                    <Button
                      key={amt}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleQuickAmount(amt)}
                      className="transition-all hover:scale-105 flex items-center gap-1.5"
                    >
                      <UsdtIcon />
                      {amt.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Period Toggle */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Period</Label>
                <div className="flex gap-2">
                  <Button
                    variant={period === "daily" ? "default" : "outline"}
                    onClick={() => setPeriod("daily")}
                    className="flex-1 transition-all"
                  >
                    Daily
                  </Button>
                  <Button
                    variant={period === "30days" ? "default" : "outline"}
                    onClick={() => setPeriod("30days")}
                    className="flex-1 transition-all"
                  >
                    30 Days
                  </Button>
                </div>
              </div>

              {/* Results Display */}
              <div className="pt-4 space-y-4">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Your Rate:</span>
                    <span className="text-xl font-bold text-primary">{(rate * 100).toFixed(1)}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Investment:</span>
                    <span className="text-lg font-semibold flex items-center gap-1.5">
                      <UsdtIcon />
                      {numAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border-2 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{period === "daily" ? "Daily" : "30-Day"} Return:</span>
                      </div>
                      <span className="text-2xl font-bold text-accent flex items-center gap-2">
                        <UsdtIcon />
                        {calculatedReturn.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Disclaimer */}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Illustrative estimates. See Plans for details.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default RatesCalculator;
