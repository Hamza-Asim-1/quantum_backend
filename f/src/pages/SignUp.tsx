import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import Header from "@/components/Header";

const signUpSchema = z.object({
  referralId: z.string().trim().optional(),
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100, { message: "Name must be less than 100 characters" }),
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255, { message: "Email must be less than 255 characters" }),
  contact: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, { message: "Please enter a valid phone number with country code (e.g., +92 9876543210). Min 10, max 15 digits" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(100, { message: "Password must be less than 100 characters" })
    .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
    .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { message: "Password must contain at least one special character" }),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and privacy policy",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const navigate = useNavigate();
  const { signup,  loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  // Clear form when component mounts
  useEffect(() => {
    reset();
  }, [reset]);

  const acceptTerms = watch("acceptTerms");

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      await signup(data.email, data.password, data.name, data.contact, data.referralId);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      // Better error handling with specific messages from backend
      const errorMessage = error.message || "Failed to create account. Please try again.";
      toast.error(errorMessage);
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-secondary/20 to-background">
        <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              Quantum Pips
            </h1>
          </Link>
          <h2 className="mt-6 text-2xl font-semibold text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start growing your wealth with confidence
          </p>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="referralId">Referral ID (Optional)</Label>
              <Input
                id="referralId"
                type="text"
                placeholder="Referral ID if you have one"
                autoComplete="off"
                {...register("referralId")}
                className={errors.referralId ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.referralId && (
                <p className="text-sm text-destructive">{errors.referralId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                autoFocus
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                type="tel"
                placeholder="+92 9876543210"
                autoComplete="tel"
                {...register("contact")}
                className={errors.contact ? "border-destructive" : ""}
                disabled={isLoading}
              />
              {errors.contact && (
                <p className="text-sm text-destructive">{errors.contact.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Include country code (e.g., +92 for Pakistan)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  {...register("password")}
                  className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                  className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setValue("acceptTerms", checked as boolean)}
                className={errors.acceptTerms ? "border-destructive" : ""}
                disabled={isLoading}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I accept the{" "}
                  <Link to="/terms" className="font-medium text-primary hover:text-primary-glow underline">
                    Terms & Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="font-medium text-primary hover:text-primary-glow underline">
                    Privacy Policy
                  </Link>
                </label>
                {errors.acceptTerms && (
                  <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>



            
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link
              to="/signin"
              className="font-medium text-primary hover:text-primary-glow transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SignUp;