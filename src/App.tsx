import { Suspense, lazy } from "react";
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

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import("@/pages/HomePage"));
const JournalPage = lazy(() => import("@/pages/JournalPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AuthPage = lazy(() => import("@/pages/AuthPage"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));
const ProgressPage = lazy(() => import("@/pages/ProgressPage"));
const NutritionPage = lazy(() => import("@/pages/NutritionPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

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
                <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public route */}
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/privacy" element={<PrivacyPage />} />
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
                          <Route path="/nutrition" element={<NutritionPage />} />
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
                </Suspense>
              </BrowserRouter>
            </WorkoutProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
