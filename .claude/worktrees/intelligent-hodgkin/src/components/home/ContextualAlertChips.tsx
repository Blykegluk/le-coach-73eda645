import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Heart, Flame, Target, Moon, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface AlertChip {
  id: string;
  type: 'warning' | 'info' | 'success' | 'streak';
  icon: React.ReactNode;
  label: string;
  color: string;
}

interface ContextualAlertChipsProps {
  weeklySessionsCompleted: number;
  sleepHours: number | null;
  caloriesPercentage: number;
}

const ContextualAlertChips = ({ 
  weeklySessionsCompleted, 
  sleepHours,
  caloriesPercentage,
}: ContextualAlertChipsProps) => {
  const { user } = useAuth();
  const [healthAlerts, setHealthAlerts] = useState<string[]>([]);
  
  // Fetch health constraints from user_context
  const fetchHealthAlerts = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_context')
      .select('key, value')
      .eq('user_id', user.id)
      .like('key', 'health_%');
    
    if (data) {
      const alerts = data.map(item => item.value);
      setHealthAlerts(alerts);
    }
  }, [user]);
  
  useEffect(() => {
    fetchHealthAlerts();
  }, [fetchHealthAlerts]);
  
  // Build dynamic chips based on context
  const chips: AlertChip[] = [];
  
  // Health constraint alerts (injuries, conditions)
  healthAlerts.forEach((alert, index) => {
    // Extract condition type for smarter labels
    const isInjury = alert.toLowerCase().includes('bless') || 
                     alert.toLowerCase().includes('hernie') ||
                     alert.toLowerCase().includes('douleur');
    
    chips.push({
      id: `health-${index}`,
      type: 'warning',
      icon: <AlertTriangle className="h-3 w-3" />,
      label: isInjury ? 'Mode Adaptation Blessure' : 'Contrainte Santé',
      color: 'bg-energy/20 text-energy border-energy/30',
    });
  });
  
  // Streak celebration
  if (weeklySessionsCompleted >= 3) {
    chips.push({
      id: 'streak',
      type: 'streak',
      icon: <Flame className="h-3 w-3" />,
      label: `${weeklySessionsCompleted} séances cette semaine 🔥`,
      color: 'bg-primary/20 text-primary border-primary/30',
    });
  }
  
  // Sleep alert
  if (sleepHours !== null && sleepHours < 6) {
    chips.push({
      id: 'sleep',
      type: 'warning',
      icon: <Moon className="h-3 w-3" />,
      label: 'Sommeil insuffisant',
      color: 'bg-sleep/20 text-sleep border-sleep/30',
    });
  }
  
  // Calorie surplus/deficit
  if (caloriesPercentage > 110) {
    chips.push({
      id: 'calories-over',
      type: 'info',
      icon: <Zap className="h-3 w-3" />,
      label: 'Surplus calorique',
      color: 'bg-calories/20 text-calories border-calories/30',
    });
  }
  
  // Goal on track
  if (weeklySessionsCompleted >= 4 && caloriesPercentage >= 80 && caloriesPercentage <= 110) {
    chips.push({
      id: 'on-track',
      type: 'success',
      icon: <Target className="h-3 w-3" />,
      label: 'Objectif en bonne voie',
      color: 'bg-green-500/20 text-green-500 border-green-500/30',
    });
  }
  
  if (chips.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {chips.map((chip) => (
        <Badge
          key={chip.id}
          variant="outline"
          className={`${chip.color} px-3 py-1 text-xs font-medium flex items-center gap-1.5 rounded-full`}
        >
          {chip.icon}
          {chip.label}
        </Badge>
      ))}
    </div>
  );
};

export default ContextualAlertChips;
