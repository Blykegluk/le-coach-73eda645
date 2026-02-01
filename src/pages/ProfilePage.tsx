import { useState } from 'react';
import { Settings, ChevronRight, Target, Apple, Watch, Bell, Shield, HelpCircle, LogOut, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import GoalEditorModal from '@/components/profile/GoalEditorModal';

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Perdre du poids',
  fat_loss: 'Perdre en masse graisseuse',
  muscle_gain: 'Prendre du muscle',
  maintain: 'Maintenir mon poids',
  recomposition: 'Recomposition corporelle',
  wellness: 'Bien-être général',
};

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const { profile, isLoading } = useProfile();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const settingsItems = [
    { icon: Target, label: 'Mes objectifs' },
    { icon: Apple, label: 'Préférences alimentaires' },
    { icon: Watch, label: 'Appareils connectés' },
    { icon: Bell, label: 'Notifications' },
    { icon: Shield, label: 'Confidentialité' },
    { icon: HelpCircle, label: 'Aide & Support' },
  ];

  // Calculate age from birth_date
  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Calculate BMI
  const calculateBMI = (weight: number | null, height: number | null): string => {
    if (!weight || !height) return '-';
    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    return bmi.toFixed(1);
  };

  const age = calculateAge(profile?.birth_date ?? null);
  const bmi = calculateBMI(profile?.weight ?? null, profile?.height ?? null);
  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '-';

  if (isLoading) {
    return (
      <div className="safe-top px-4 pb-4 pt-2">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
        <div className="mb-4 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mb-4 h-16 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Profil</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* User info - REAL DATA */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <User className="h-7 w-7 text-primary-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {profile?.first_name} {profile?.last_name || ''}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Membre depuis {memberSince}</p>
          </div>
        </div>
      </div>

      {/* Stats - REAL DATA */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {[
          { label: 'Taille', value: profile?.height ? `${profile.height}cm` : '-' },
          { label: 'Poids', value: profile?.weight ? `${profile.weight}kg` : '-' },
          { label: 'Âge', value: age ? `${age} ans` : '-' },
          { label: 'IMC', value: bmi },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border bg-card p-3 text-center"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main goal - REAL DATA with edit capability */}
      <button 
        onClick={() => setIsGoalModalOpen(true)}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4 transition-all hover:bg-muted/50 active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-xs text-muted-foreground">Objectif principal</p>
            <p className="font-medium text-foreground">
              {profile?.goal ? GOAL_LABELS[profile.goal] || profile.goal : 'Non défini'}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Goal Editor Modal */}
      <GoalEditorModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        currentGoal={profile?.goal}
        currentTargetWeight={profile?.target_weight}
      />

      {/* Settings */}
      <div className="mb-4">
        <p className="mb-3 text-sm font-medium text-foreground">Paramètres</p>
        <div className="space-y-1">
          {settingsItems.map((item) => (
            <button
              key={item.label}
              className="flex w-full items-center justify-between rounded-xl p-3 transition-all hover:bg-muted/50 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout - FUNCTIONAL */}
      <button 
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-[0.99]"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Se déconnecter</span>
      </button>

      {/* Version */}
      <p className="mt-4 text-center text-xs text-muted-foreground">HealthLab Coach v1.0.0</p>
    </div>
  );
};

export default ProfilePage;
