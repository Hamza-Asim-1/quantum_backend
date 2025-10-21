import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { adminAuthAPI } from "@/services/api";
import { toast } from "sonner"; // ✅ Add this import
import Header from "@/components/Header";
const AdminSignIn = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Starting admin login...');
      await adminAuthAPI.login(formData.email, formData.password);
      console.log('✅ Admin login successful');
      
      // ✅ Show success message
      toast.success("Welcome back, Admin!");
      
      // ✅ Small delay to show the toast, then navigate
      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 300);
      
    } catch (err: any) {
      console.error('❌ Admin login error:', err);
      setError(err.message || "Invalid email or password");
      toast.error(err.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        ></div>

        {/* Floating gradient blur elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl"></div>

        {/* Main card */}
        <div className="relative w-full max-w-md">
        <div className="backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 rounded-3xl p-8 sm:p-10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 mb-6 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-2">Secure admin access only</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200 text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@platform.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="backdrop-blur-sm bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 transition-all h-12"
                required
                aria-label="Email"
                disabled={isLoading}
              />
            </div>

            {/* Password input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="backdrop-blur-sm bg-slate-900/50 border-slate-600/50 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500/50 transition-all h-12 pr-10"
                  required
                  aria-label="Password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-400/30 backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              aria-label="Sign in to admin portal"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          
        </div>
      </div>
    </div>
    </>
  );
};

export default AdminSignIn;
