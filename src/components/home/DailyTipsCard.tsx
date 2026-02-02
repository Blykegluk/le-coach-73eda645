import { Lightbulb, Droplets, Footprints, Dumbbell, Utensils, Moon, Heart, Flame, Battery, Sparkles } from 'lucide-react';
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
  priority: number; // Higher = more important
}

const DailyTipsCard = ({ metrics, profile, weeklySessionsCompleted }: DailyTipsCardProps) => {
  const waterGoal = profile?.target_water_ml ?? 2500;
  const caloriesGoal = profile?.target_calories ?? 2000;
  const stepsGoal = profile?.target_steps ?? 10000;
  const goal = profile?.goal;

  const generateTips = (): Tip[] => {
    const tips: Tip[] = [];
    const now = new Date();
    const hour = now.getHours();

    // === WORKOUT TIPS ===
    if (weeklySessionsCompleted > 0) {
      tips.push({
        icon: <Dumbbell className="h-4 w-4" />,
        message: "Bravo pour ta séance ! 💪 Laisse tes muscles récupérer.",
        type: 'success',
        priority: 10,
      });
    } else if (hour >= 10 && hour <= 20) {
      tips.push({
        icon: <Dumbbell className="h-4 w-4" />,
        message: "Pas encore de séance cette semaine ? C'est le moment de bouger ! 🏃",
        type: 'suggestion',
        priority: 5,
      });
    }

    // === WATER TIPS ===
    const waterConsumed = metrics?.waterMl ?? 0;
    const waterPercentage = (waterConsumed / waterGoal) * 100;
    
    if (waterPercentage >= 100) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Objectif hydratation atteint ! 💧 Tu es au top !",
        type: 'success',
        priority: 8,
      });
    } else if (waterPercentage >= 70) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Presque ! Encore un peu d'eau pour atteindre ton objectif 💧",
        type: 'suggestion',
        priority: 6,
      });
    } else if (waterPercentage < 30 && hour >= 12) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Tu n'as pas assez bu ! 💧 Prends un grand verre d'eau maintenant.",
        type: 'reminder',
        priority: 9,
      });
    } else if (hour >= 14 && waterPercentage < 50) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Pense à boire régulièrement, tu es à mi-chemin 💧",
        type: 'suggestion',
        priority: 7,
      });
    } else if (waterConsumed === 0 && hour >= 9) {
      tips.push({
        icon: <Droplets className="h-4 w-4" />,
        message: "Commence ta journée avec un verre d'eau ! 💧",
        type: 'reminder',
        priority: 8,
      });
    }

    // === CALORIES TIPS ===
    const caloriesConsumed = metrics?.caloriesIn ?? 0;
    const caloriesPercentage = (caloriesConsumed / caloriesGoal) * 100;

    if (caloriesPercentage >= 90 && caloriesPercentage <= 110) {
      tips.push({
        icon: <Flame className="h-4 w-4" />,
        message: "Parfait ! Tu as atteint ton objectif calorique 🎯",
        type: 'success',
        priority: 8,
      });
    } else if (hour >= 19 && caloriesPercentage > 85 && caloriesPercentage < 100) {
      tips.push({
        icon: <Utensils className="h-4 w-4" />,
        message: "Tu approches de ton quota. Un dîner léger sera parfait ! 🥗",
        type: 'suggestion',
        priority: 7,
      });
    } else if (hour >= 19 && caloriesPercentage > 100) {
      tips.push({
        icon: <Utensils className="h-4 w-4" />,
        message: "Tu as dépassé ton objectif. Pas de panique, reste léger ce soir 🌙",
        type: 'reminder',
        priority: 6,
      });
    } else if (hour >= 13 && caloriesConsumed === 0) {
      tips.push({
        icon: <Utensils className="h-4 w-4" />,
        message: "N'oublie pas de noter tes repas pour suivre ta nutrition ! 📝",
        type: 'reminder',
        priority: 7,
      });
    } else if (hour >= 12 && hour <= 14 && caloriesPercentage < 30) {
      tips.push({
        icon: <Utensils className="h-4 w-4" />,
        message: "C'est l'heure du déjeuner ! Fais le plein d'énergie 🍽️",
        type: 'suggestion',
        priority: 5,
      });
    }

    // === STEPS TIPS ===
    const steps = metrics?.steps ?? 0;
    const stepsPercentage = (steps / stepsGoal) * 100;

    if (stepsPercentage >= 100) {
      tips.push({
        icon: <Footprints className="h-4 w-4" />,
        message: "Objectif pas atteint ! Tu marches comme un champion ! 🔥",
        type: 'success',
        priority: 8,
      });
    } else if (stepsPercentage >= 70) {
      tips.push({
        icon: <Footprints className="h-4 w-4" />,
        message: "Encore quelques pas et c'est bon ! Continue 👣",
        type: 'suggestion',
        priority: 6,
      });
    } else if (hour >= 16 && stepsPercentage < 50) {
      tips.push({
        icon: <Footprints className="h-4 w-4" />,
        message: "Une petite marche de 15 min te ferait du bien ! 🚶",
        type: 'suggestion',
        priority: 5,
      });
    }

    // === GOAL-SPECIFIC TIPS ===
    if (goal === 'weight_loss' || goal === 'fat_loss') {
      if (caloriesConsumed > 0 && caloriesPercentage < 80 && hour >= 18) {
        tips.push({
          icon: <Heart className="h-4 w-4" />,
          message: "Tu gères bien ton déficit calorique, continue ! 💚",
          type: 'success',
          priority: 7,
        });
      }
    } else if (goal === 'muscle_gain') {
      if (caloriesConsumed > 0 && caloriesPercentage < 70 && hour >= 15) {
        tips.push({
          icon: <Battery className="h-4 w-4" />,
          message: "Pour prendre du muscle, n'oublie pas de manger assez ! 💪",
          type: 'reminder',
          priority: 7,
        });
      }
    }

    // === TIME-BASED TIPS ===
    if (hour >= 6 && hour <= 8) {
      tips.push({
        icon: <Sparkles className="h-4 w-4" />,
        message: "Bien dormi ? Commence ta journée avec énergie ! ☀️",
        type: 'suggestion',
        priority: 3,
      });
    } else if (hour >= 21 && hour <= 23) {
      tips.push({
        icon: <Moon className="h-4 w-4" />,
        message: "Bientôt l'heure du repos. Un bon sommeil = meilleure récupération 😴",
        type: 'reminder',
        priority: 4,
      });
    } else if (hour >= 14 && hour <= 16) {
      tips.push({
        icon: <Battery className="h-4 w-4" />,
        message: "Coup de fatigue ? Une petite pause ou un snack sain ! 🍎",
        type: 'suggestion',
        priority: 3,
      });
    }

    // === DEFAULT MOTIVATIONAL TIPS ===
    if (tips.length < 3) {
      const motivationalTips: Tip[] = [
        {
          icon: <Lightbulb className="h-4 w-4" />,
          message: "Chaque petit pas compte vers ton objectif ! ✨",
          type: 'suggestion',
          priority: 1,
        },
        {
          icon: <Heart className="h-4 w-4" />,
          message: "La régularité est la clé du succès. Tu es sur la bonne voie ! 💪",
          type: 'suggestion',
          priority: 1,
        },
        {
          icon: <Sparkles className="h-4 w-4" />,
          message: "Parle à ton coach IA pour des conseils personnalisés ! 🤖",
          type: 'suggestion',
          priority: 2,
        },
      ];
      tips.push(...motivationalTips);
    }

    // Sort by priority (highest first) and return top 3
    return tips
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
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
