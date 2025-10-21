import { UserPlus, Wallet, TrendingUp, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up in minutes with just your email and set your secure password.",
  },
  {
    icon: Wallet,
    title: "Deposit",
    description: "Transfer funds securely using your preferred payment method.",
  },
  {
    icon: TrendingUp,
    title: "Track & Withdraw",
    description: "Monitor your earnings in real-time and withdraw anytime with ease.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works"className="py-20 px-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Get started in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                <Card className="h-full transition-all duration-300 hover:shadow-elegant hover:-translate-y-1">
                  <CardContent className="p-8 text-center">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-glow">
                      {index + 1}
                    </div>
                    
                    <div className="mt-6 mb-6 flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-3 text-foreground">
                      {step.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>

                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-primary w-6 h-6 z-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
