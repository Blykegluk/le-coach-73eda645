import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import OnboardingGate from "@/components/layout/OnboardingGate";
import SubscriptionGate from "@/components/layout/SubscriptionGate";
import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/pages/HomePage";
import JournalPage from "@/pages/JournalPage";
// TrainingPage & PerformancePage are replaced by ProgressPage
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
import ProgressPage from "@/pages/ProgressPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Sonner />
        <AuthProvider>
          <SubscriptionProvider>
            <WorkoutProvider>
              <BrowserRouter>
                <Routes>
                  {/* Public route */}
                  <Route path="/auth" element={<AuthPage />} />
                  
                  {/* Protected routes - require authentication */}
                  <Route element={<ProtectedRoute />}>
                    {/* Onboarding - accessible after login but before profile completion */}
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    
                    {/* Main app routes - require completed profile AND active subscription/trial */}
                    <Route element={<OnboardingGate />}>
                      <Route element={<SubscriptionGate />}>
                        <Route element={<AppLayout />}>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/progress" element={<ProgressPage />} />
                          <Route path="/journal" element={<JournalPage />} />
                          {/* Legacy routes → redirect to /progress */}
                          <Route path="/training" element={<Navigate to="/progress" replace />} />
                          <Route path="/performance" element={<Navigate to="/progress" replace />} />
                          <Route path="/profile" element={<ProfilePage />} />
                        </Route>
                      </Route>
                    </Route>
                  </Route>
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </WorkoutProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
