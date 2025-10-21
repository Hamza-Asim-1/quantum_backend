// src/contexts/AuthContext.tsx

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiService, User } from "../services/api";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (email: string, password: string, name: string, contact: string, referralId?: string) => Promise<void>;
 
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      if (apiService.isAuthenticated()) {
        // Try to get user profile to validate token
        const userProfile = await apiService.getProfile();
        setUser(userProfile);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      // Clear invalid tokens
      apiService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe?: boolean) => {
    try {
      setLoading(true);
      const authResponse = await apiService.login(email, password);
      
      setUser(authResponse.user);
      setIsAuthenticated(true);
      
      // Store user data for quick access
      localStorage.setItem('user', JSON.stringify(authResponse.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error; // Re-throw so UI can handle the error
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    name: string, 
    contact: string, 
    referralId?: string
  ) => {
    try {
      setLoading(true);
      const authResponse = await apiService.register(
        email, 
        password, 
        name, 
        contact, 
        referralId
      );
      
      setUser(authResponse.user);
      setIsAuthenticated(true);
      
      // Store user data for quick access
      localStorage.setItem('user', JSON.stringify(authResponse.user));
    } catch (error) {
      console.error('Signup failed:', error);
      throw error; // Re-throw so UI can handle the error
    } finally {
      setLoading(false);
    }
  };

 

  const logout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('user');
  };

  const refreshUserProfile = async () => {
    try {
      const userProfile = await apiService.getProfile();
      setUser(userProfile);
      localStorage.setItem('user', JSON.stringify(userProfile));
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
      // If profile fetch fails, user might need to login again
      logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user, 
        loading,
        login, 
        signup, 

        logout,
        refreshUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context.user;
};