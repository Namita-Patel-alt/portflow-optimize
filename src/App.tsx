import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import OperatorShifts from "./pages/operator/OperatorShifts";
import OperatorDelays from "./pages/operator/OperatorDelays";
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard";
import SupervisorOperators from "./pages/supervisor/SupervisorOperators";
import SupervisorVehicles from "./pages/supervisor/SupervisorVehicles";
import SupervisorAnalytics from "./pages/supervisor/SupervisorAnalytics";
import SupervisorRatings from "./pages/supervisor/SupervisorRatings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Operator Routes */}
            <Route path="/operator" element={<OperatorDashboard />} />
            <Route path="/operator/shifts" element={<OperatorShifts />} />
            <Route path="/operator/delays" element={<OperatorDelays />} />
            
            {/* Supervisor Routes */}
            <Route path="/supervisor" element={<SupervisorDashboard />} />
            <Route path="/supervisor/operators" element={<SupervisorOperators />} />
            <Route path="/supervisor/vehicles" element={<SupervisorVehicles />} />
            <Route path="/supervisor/analytics" element={<SupervisorAnalytics />} />
            <Route path="/supervisor/ratings" element={<SupervisorRatings />} />
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
