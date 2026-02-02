import { Lightbulb, Droplets, Footprints, Dumbbell, Utensils, Moon } from 'lucide-react';
import type { HealthMetrics } from '@/providers/health';
import type { Profile } from '@/types/profile';

interface DailyTipsCardProps {
  metrics: HealthMetrics | null;
  profile: Profile | null;
  weeklySessionsCompleted: number;
}

interface Tip {
  icon: React.ReactNode;
  message: string;
  type: 'success' | 'suggestion' | 'reminder';
}

const DailyTipsCard = ({ metrics, profile, weeklySessionsCompleted }: DailyTipsCardProps) => {
  const waterGoal = profile?.target_water_ml ?? 2500;
  const caloriesGoal = profile?.target_calories ?? 2000;
  const stepsGoal = profile?.target_steps ?? 10000;

  const generateTips = (): Tip[] => {
    const tips: Tip[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Check if workout was done today
    if (weeklySessionsCompleted > 0) {
      tips.push({
        icon: <Dumbbell className="h-4 w-4" />,
        message: "Bravo pour ta séance ! 💪 Laisse tes muscles récupérer aujourd'hui.",
        type: 'success',
      });
    }

    // Water tips
    const waterConsumed = metrics?.waterMl ?? 0;
    const waterPercentage = (waterConsumed / waterGoal) * 100;
    
    if (waterPercentage < 30 && hour >= 12) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Tu n'as pas assez bu aujourd'hui ! 💧 Prends un grand verre d'eau maintenant.",
        type: 'reminder',
      });
    } else if (waterPercentage >= 80) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Excellent ! Tu es bien hydraté(e) aujourd'hui ! 💧",
        type: 'success',
      });
    } else if (hour >= 14 && waterPercentage < 50) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Pense à boire régulièrement, tu es à mi-chemin de ton objectif eau.",
        type: 'suggestion',
      });
    }

    // Calories tips
    const caloriesConsumed = metrics?.caloriesIn ?? 0;
    const caloriesPercentage = (caloriesConsumed / caloriesGoal) * 100;

    if (hour >= 19 && caloriesPercentage > 90) {
      tips.push({
        icon: <Utensils className="h-4 w-4" />,
        message: "Tu as presque atteint ton quota calories. Opte pour un dîner léger ! 🥗",
        type: 'suggestion',
      });
    } else if (hour >= 13 && caloriesConsumed === 0) {
      tips.push({
        icon: <Utensils className="h-4 w-4" />,
        message: "N'oublie pas de noter tes repas pour suivre ta nutrition ! 📝",
        type: 'reminder',
      });
    }

    // Steps tips
    const steps = metrics?.steps ?? 0;
    const stepsPercentage = (steps / stepsGoal) * 100;

    if (stepsPercentage >= 100) {
      tips.push({
        icon: <Footprints className="h-4 w-4" />,
        message: "Objectif pas atteint ! Tu es en feu aujourd'hui ! 🔥",
        type: 'success',
      });
    } else if (hour >= 16 && stepsPercentage < 50) {
      tips.push({
        icon: <Footprints className="h-4 w-4" />,
        message: "Une petite marche de 15 min te ferait du bien ! 🚶",
        type: 'suggestion',
      });
    }

    // Evening tip
    if (hour >= 21) {
      tips.push({
        icon: <Moon className="h-4 w-4" />,
        message: "Il se fait tard, pense à te coucher tôt pour bien récupérer ! 😴",
        type: 'reminder',
      });
    }

    // Default tip if none generated
    if (tips.length === 0) {
      tips.push({
        icon: <Lightbulb className="h-4 w-4" />,
        message: "Commence ta journée du bon pied ! Fixe-toi un petit objectif atteignable. ✨",
        type: 'suggestion',
      });
    }

    // Return max 2 tips
    return tips.slice(0, 2);
  };

  const tips = generateTips();

  const getTypeStyles = (type: Tip['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400';
      case 'reminder':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400';
      case 'suggestion':
      default:
        return 'bg-primary/10 border-primary/20 text-primary';
    }
  };

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Conseils du jour</span>
      </div>
      <div className="space-y-2">
        {tips.map((tip, index) => (
          <div
            key={index}
            className={`flex items-start gap-3 rounded-xl border p-3 ${getTypeStyles(tip.type)}`}
          >
            <div className="mt-0.5 shrink-0">{tip.icon}</div>
            <p className="text-sm">{tip.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyTipsCard;
