import { Shield, CheckCircle, Lock, FileCheck } from "lucide-react";

const securityFeatures = [
  {
    icon: Shield,
    title: "Best-practice safeguards",
    description: "Industry-leading security measures protect your investments at every step.",
  },
  {
    icon: CheckCircle,
    title: "Independent checks",
    description: "Regular third-party audits ensure transparency and operational integrity.",
  },
  {
    icon: Lock,
    title: "Privacy-first data handling",
    description: "Your personal information is encrypted and never shared without consent.",
  },
  {
    icon: FileCheck,
    title: "Clear processes",
    description: "Straightforward terms and transparent procedures you can trust.",
  },
];

const SecurityCompliance = () => {
  return (
    <section className="py-20 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-foreground">Security & Compliance</h2>
          <p className="text-muted-foreground text-lg">Your trust and safety are our top priorities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {securityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary group-hover:shadow-glow">
                  <Icon className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                </div>

                <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>

                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SecurityCompliance;
