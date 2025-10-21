import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import UsdtIcon from "@/components/ui/usdt-icon";

const faqs = [
  {
    question: "How do I get started?",
    answer: "Create an account, complete verification, choose your investment level, and make your first deposit. You'll start earning returns immediately based on your chosen plan."
  },
  {
    question: "What are the minimum and maximum investment amounts?",
    answer: (
      <span className="flex items-baseline gap-1.5 flex-wrap">
        Investment minimums vary by plan level, starting from <UsdtIcon className="w-3.5 h-3.5 inline-block" /> 100 for Level 1. Maximum amounts depend on your selected tier, with Level 5 accommodating larger investments.
      </span>
    )
  },
  {
    question: "How often can I withdraw?",
    answer: "Withdrawals are processed according to your plan terms. Most plans allow regular withdrawals with a simple request through your dashboard."
  },
  {
    question: "Is my investment secure?",
    answer: "We implement industry best practices for security, including encryption, regular audits, and compliance measures to protect your investment and personal data."
  },
  {
    question: "What happens if I need to withdraw early?",
    answer: "Early withdrawal terms vary by plan. Review your specific plan details for any applicable conditions or fees before making an early withdrawal request."
  },
  {
    question: "How are returns calculated and paid?",
    answer: "Returns are calculated based on your investment amount and plan rate. Payments are processed automatically according to your plan schedule and deposited to your account."
  }
];

const MiniFAQ = () => {
  return (
    <section id="faq" className="py-16 px-4 bg-background">
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Frequently Asked Questions
        </h2>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border rounded-lg px-6 bg-card"
            >
              <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pt-2">
                {typeof faq.answer === 'string' ? faq.answer : <div>{faq.answer}</div>}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default MiniFAQ;