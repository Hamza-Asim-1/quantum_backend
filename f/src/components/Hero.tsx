import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, TrendingUp, Users, Zap } from "lucide-react";
import heroImage from "@/assets/crypto-hero.jpg";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const navigate = useNavigate();
  // Simple handler
  const scrollToPlans = () => {
    document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative min-h-[600px] overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary-glow/5 to-accent/10" />

      {/* Hero Image with Overlay */}
      <div className="absolute inset-0 opacity-20">
        <img src={heroImage} alt="Crypto investment visualization" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
      </div>

      {/* Content */}
      <div className="container relative mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              Grow Your Crypto
            </span>
            <br />
            with Smart Investments
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn up to 0.7% daily returns with our tiered investment plans. Secure, transparent, and built for the
            future of finance.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => {
                navigate("/signin");
              }}
              className="w-full sm:w-auto"
            >
              Start Investing
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline-light"
              size="lg"
              className="w-full sm:w-auto"
              onClick={scrollToPlans}
              style={{
                backgroundColor: "#06b6d4",
                color: "white",
                border: "none",
              }}
            >
              View Plans
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">Bank-Grade</div>
                <div className="text-sm text-muted-foreground">Security</div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">Up to 0.7%</div>
                <div className="text-sm text-muted-foreground">Daily Returns</div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">Instant</div>
                <div className="text-sm text-muted-foreground">Withdrawals</div>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">Satisfied</div>
                <div className="text-sm text-muted-foreground">Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
