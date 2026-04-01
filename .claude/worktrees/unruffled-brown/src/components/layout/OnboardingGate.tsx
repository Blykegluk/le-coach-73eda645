import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

/**
 * Gatekeeper component that blocks access to the app until profile is complete.
 * If profile is incomplete, redirects to /onboarding.
 */
export default function OnboardingGate() {
  const { isLoading, isComplete } = useProfile();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
