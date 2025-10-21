import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const FinalCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-secondary/20 to-primary/5">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
          Start growing your wealth with confidence today
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            size="lg" 
            className="min-w-[160px] bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
            onClick={() => navigate("/signup")}
          >
            Sign up
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="min-w-[160px] border-2 hover:bg-secondary"
            onClick={() => navigate("/signin")}
          >
            Sign in
          </Button>
        </div>

        {/* Admin Portal Link */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <button
            onClick={() => navigate("/admin/signin")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin Portal →
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;