import { useAuth } from '@/contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { usePerformanceStats } from '@/hooks/queries/usePerformanceQueries';
import { useProgressRealtimeInvalidation } from '@/hooks/queries/useProgressQueries';
import { useUserWeight } from '@/hooks/queries/useTrainingQueries';
import AppHeader from '@/components/layout/AppHeader';
import StatsGrid from '@/components/progress/StatsGrid';
import WeightProgressSection from '@/components/progress/WeightProgressSection';
import ExerciseProgressionSection from '@/components/progress/ExerciseProgressionSection';
import NutritionProgressSection from '@/components/progress/NutritionProgressSection';
import BodyCompositionSection from '@/components/progress/BodyCompositionSection';
import WeeklyCarousel from '@/components/training/WeeklyCarousel';

const ProgressPage = () => {
  const { user } = useAuth();
  const { onOpenCoach } = useOutletContext<{ onOpenCoach: () => void }>();
  const userId = user?.id;
  const { data: stats, isLoading: statsLoading } = usePerformanceStats(userId);
  const { data: userWeight } = useUserWeight(userId);

  // Subscribe to realtime invalidation
  useProgressRealtimeInvalidation(userId);

  return (
    <div className="safe-top px-4 pb-24 pt-2">
      <AppHeader title="Progression" />

      <StatsGrid stats={stats ?? null} isLoading={statsLoading} />

      <WeeklyCarousel userWeight={userWeight} />

      <WeightProgressSection userId={userId} />

      <ExerciseProgressionSection userId={userId} />

      <NutritionProgressSection userId={userId} onOpenCoach={onOpenCoach} />

      <BodyCompositionSection userId={userId} />
    </div>
  );
};

export default ProgressPage;
