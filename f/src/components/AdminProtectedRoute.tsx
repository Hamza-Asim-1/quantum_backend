import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { adminAuthAPI } from "@/services/api";
import { Loader2 } from "lucide-react";

interface AdminProtectedRouteProps {
  children: ReactNode;
}

const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        // Check if token exists in localStorage
        if (!adminAuthAPI.isAuthenticated()) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Verify token by calling API
        const isValid = await adminAuthAPI.verifyToken();
        setIsAuthenticated(isValid);
        
        if (!isValid) {
          // Clear invalid tokens
          adminAuthAPI.logout();
        }
      } catch (error) {
        console.error('Admin auth verification failed:', error);
        adminAuthAPI.logout();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/signin" replace />;
  }

  // Render protected content if authenticated
  return <>{children}</>;
};

export default AdminProtectedRoute;