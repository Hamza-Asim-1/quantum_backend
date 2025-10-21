// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { AuthProvider } from "@/contexts/AuthContext";
// import ProtectedRoute from "@/components/ProtectedRoute";
// import Index from "./pages/Index";
// import SignIn from "./pages/SignIn";
// import SignUp from "./pages/SignUp";
// import Dashboard from "./pages/Dashboard";
// import KYC from "./pages/KYC";
// import Investments from "./pages/Investments";
// import MyInvestments from "./pages/MyInvestments";
// import Withdraw from "./pages/Withdraw";
// import WithdrawHistory from "./pages/WithdrawHistory";
// import Transactions from "./pages/Transactions";
// import NotFound from "./pages/NotFound";
// import AdminSignIn from "./pages/AdminSignIn";
// import AdminDashboard from "./pages/AdminDashboard";
// import AdminUsers from "./pages/AdminUsers";
// import AdminUserDetails from "./pages/AdminUserDetails";
// import AdminKYC from "./pages/AdminKYC";
// import AdminKYCDetail from "./pages/AdminKYCDetail";
// import AdminWithdrawals from "./pages/AdminWithdrawals";
// import AdminWithdrawalDetail from "./pages/AdminWithdrawalDetail";
// import AdminDeposits from "./pages/AdminDeposits";
// import AdminDepositDetail from "./pages/AdminDepositDetail";
// import Deposit from "./pages/Deposit";
// import DepositHistory from "./pages/DepositHistory";

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <AuthProvider>
//         <Toaster />
//         <Sonner />
//         <BrowserRouter>
//           <Routes>
//             <Route path="/" element={<Index />} />
//             <Route 
//               path="/signin" 
//               element={
//                 <ProtectedRoute requireAuth={false}>
//                   <SignIn />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/signup" 
//               element={
//                 <ProtectedRoute requireAuth={false}>
//                   <SignUp />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/dashboard" 
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <Dashboard />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/kyc" 
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <KYC />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/investments" 
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <Investments />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/investments/history" 
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <MyInvestments />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/deposit"
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <Deposit />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/deposit/history" 
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <DepositHistory />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/withdraw"
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <Withdraw />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/withdraw/history" 
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <WithdrawHistory />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route 
//               path="/transactions"
//               element={
//                 <ProtectedRoute requireAuth={true}>
//                   <Transactions />
//                 </ProtectedRoute>
//               } 
//             />
//             <Route path="/admin" element={<AdminSignIn />} />
//             <Route path="/admin/dashboard" element={<AdminDashboard />} />
//             <Route path="/admin/dashboard/users" element={<AdminUsers />} />
//             <Route path="/admin/dashboard/users/:userId" element={<AdminUserDetails />} />
//             <Route path="/admin/dashboard/kyc" element={<AdminKYC />} />
//             <Route path="/admin/dashboard/kyc/:submissionId" element={<AdminKYCDetail />} />
//             <Route path="/admin/dashboard/withdrawals" element={<AdminWithdrawals />} />
//              <Route path="/admin/dashboard/withdrawals/:id" element={<AdminWithdrawalDetail />} />
//             <Route path="/admin/dashboard/deposits" element={<AdminDeposits />} />
//             <Route path="/admin/dashboard/deposits/:id" element={<AdminDepositDetail />} />
//             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//             <Route path="*" element={<NotFound />} />
//           </Routes>
//         </BrowserRouter>
//       </AuthProvider>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute"; // ✅ Import
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import KYC from "./pages/KYC";
import Investments from "./pages/Investments";
import MyInvestments from "./pages/MyInvestments";
import Withdraw from "./pages/Withdraw";
import WithdrawHistory from "./pages/WithdrawHistory";
import Transactions from "./pages/Transactions";
import NotFound from "./pages/NotFound";
import AdminSignIn from "./pages/AdminSignIn";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminUserDetails from "./pages/AdminUserDetails";
import AdminKYC from "./pages/AdminKYC";
import AdminKYCDetail from "./pages/AdminKYCDetail";
import AdminWithdrawals from "./pages/AdminWithdrawals";
import AdminWithdrawalDetail from "./pages/AdminWithdrawalDetail";
import AdminDeposits from "./pages/AdminDeposits";
import AdminDepositDetail from "./pages/AdminDepositDetail";
import Deposit from "./pages/Deposit";
import DepositHistory from "./pages/DepositHistory";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            
            {/* User Auth Routes */}
            <Route 
              path="/signin" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <SignIn />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <SignUp />
                </ProtectedRoute>
              } 
            />
            
            {/* User Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/kyc" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <KYC />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/investments" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <Investments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/investments/history" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <MyInvestments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/deposit"
              element={
                <ProtectedRoute requireAuth={true}>
                  <Deposit />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/deposit/history" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <DepositHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/withdraw"
              element={
                <ProtectedRoute requireAuth={true}>
                  <Withdraw />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/withdraw/history" 
              element={
                <ProtectedRoute requireAuth={true}>
                  <WithdrawHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/transactions"
              element={
                <ProtectedRoute requireAuth={true}>
                  <Transactions />
                </ProtectedRoute>
              } 
            />

            {/* Admin Routes */}
            <Route path="/admin/signin" element={<AdminSignIn />} />
            
            {/* ✅ Admin Protected Routes */}
            <Route 
              path="/admin/dashboard" 
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/users" 
              element={
                <AdminProtectedRoute>
                  <AdminUsers />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/users/:userId" 
              element={
                <AdminProtectedRoute>
                  <AdminUserDetails />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/kyc" 
              element={
                <AdminProtectedRoute>
                  <AdminKYC />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/kyc/:submissionId" 
              element={
                <AdminProtectedRoute>
                  <AdminKYCDetail />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/withdrawals" 
              element={
                <AdminProtectedRoute>
                  <AdminWithdrawals />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/withdrawals/:id" 
              element={
                <AdminProtectedRoute>
                  <AdminWithdrawalDetail />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/deposits" 
              element={
                <AdminProtectedRoute>
                  <AdminDeposits />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin/dashboard/deposits/:id" 
              element={
                <AdminProtectedRoute>
                  <AdminDepositDetail />
                </AdminProtectedRoute>
              } 
            />

            {/* 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;