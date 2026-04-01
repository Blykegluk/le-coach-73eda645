import { useAuth } from '@/contexts/AuthContext';
import { useOutletContext } from 'react-router-dom';
import { usePerformanceStats, usePerformanceRealtimeInvalidation } from '@/hooks/queries/usePerformanceQueries';
import { useProgressRealtimeInvalidation } from '@/hooks/queries/useProgressQueries';
import { useUserWeight } from '@/hooks/queries/useTrainingQueries';
import { useProfile } from '@/hooks/useProfile';
import AppHeader from '@/components/layout/AppHeader';
import StatsGrid from '@/components/progress/StatsGrid';
import WeightProgressSection from '@/components/progress/WeightProgressSection';
import ExerciseProgressionSection from '@/components/progress/ExerciseProgressionSection';
import NutritionProgressSection from '@/components/progress/NutritionProgressSection';
import BodyCompositionSection from '@/components/progress/BodyCompositionSection';
import WeeklyCarousel from '@/components/training/WeeklyCarousel';
import TrainingCalendar from '@/components/training/TrainingCalendar';
import { ShareableProgressCard } from '@/components/progress/ShareableProgressCard';

const ProgressPage = () => {
  const { user } = useAuth();
  const { onOpenCoach } = useOutletContext<{ onOpenCoach: () => void }>();
  const userId = user?.id;
  const { data: stats, isLoading: statsLoading } = usePerformanceStats(userId);
  const { data: userWeight } = useUserWeight(userId);
  const { profile } = useProfile();

  // Subscribe to realtime invalidation
  useProgressRealtimeInvalidation(userId);
  usePerformanceRealtimeInvalidation(userId);

  return (
    <div className="safe-top px-4 pb-24 pt-2">
      <AppHeader title="Progression" />

      <StatsGrid stats={stats ?? null} isLoading={statsLoading} />

      <TrainingCalendar userId={userId} />

      <WeeklyCarousel userWeight={userWeight} />

      <WeightProgressSection userId={userId} />

      <ExerciseProgressionSection userId={userId} />

      <NutritionProgressSection userId={userId} onOpenCoach={onOpenCoach} />

      <BodyCompositionSection userId={userId} />

      {/* Share Progress */}
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Partager ma progression</h3>
        <ShareableProgressCard
          userName={profile?.first_name || 'Athlète'}
          stats={{
            totalWorkouts: stats?.totalSessions,
            currentStreak: stats?.currentStreak,
          }}
        />
      </div>
    </div>
  );
};

export default ProgressPage;
