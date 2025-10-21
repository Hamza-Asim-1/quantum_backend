import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Simple, transparent, and reliable. Exactly what I was looking for.",
    name: "Sarah M.",
    company: "Independent Investor",
    avatar: "/placeholder.svg",
    initials: "SM",
  },
  {
    quote: "The rates are competitive and the process is straightforward. No surprises.",
    name: "James K.",
    company: "Tech Startup Founder",
    avatar: "/placeholder.svg",
    initials: "JK",
  },
  {
    quote: "I appreciate the clear communication and consistent returns.",
    name: "Maria L.",
    company: "Portfolio Manager",
    avatar: "/placeholder.svg",
    initials: "ML",
  },
];

const Testimonials = () => {
  return (
    <section className="py-16 px-4 bg-secondary/30">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">What Our Clients Say</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative hover:shadow-lg transition-shadow duration-300 border-border bg-card">
              <CardContent className="pt-6 pb-6">
                <Quote className="w-8 h-8 text-primary/20 mb-4" />
                <p className="text-foreground mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3 mt-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
