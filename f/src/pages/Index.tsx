import Header from "@/components/Header";
import Hero from "@/components/Hero";
import RatesCalculator from "@/components/RatesCalculator";
import InvestmentLevels from "@/components/InvestmentLevels";
import HowItWorks from "@/components/HowItWorks";
import SecurityCompliance from "@/components/SecurityCompliance";
import Testimonials from "@/components/Testimonials";
import MiniFAQ from "@/components/MiniFAQ";
import FinalCTA from "@/components/FinalCTA";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <RatesCalculator />
        <InvestmentLevels />
        <HowItWorks />
        {/* <SecurityCompliance /> 
        <Testimonials /> */}
        <MiniFAQ />
        <FinalCTA />
      </main>
    </div>
  );
};

export default Index;
