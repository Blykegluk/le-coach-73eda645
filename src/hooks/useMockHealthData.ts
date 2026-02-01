import { useState } from 'react';

export interface WeightData {
  date: string;
  real: number;
  target: number;
}

export interface ActivityData {
  steps: number;
  goal: number;
  calories: number;
}

export interface NutritionData {
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  hydration: { consumed: number; goal: number };
}

export interface ChatMessage {
  id: string;
  sender: 'coach' | 'user';
  content: string;
  timestamp: Date;
}

export interface WorkoutSession {
  id: string;
  name: string;
  duration: number;
  exercises: number;
  calories: number;
  status: 'planned' | 'completed' | 'rest';
  exerciseList?: string[];
}

export interface WeekDay {
  day: string;
  shortDay: string;
  status: 'completed' | 'rest' | 'workout' | 'today' | 'upcoming';
}

export interface Meal {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  time: string;
  calories: number;
  description?: string;
}

export interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  icon: string;
}

export interface PersonalRecord {
  id: string;
  exercise: string;
  weight: number;
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  memberSince: string;
  height: number;
  weight: number;
  age: number;
  bmi: number;
  mainGoal: string;
}

export interface Machine {
  id: string;
  name: string;
  icon: string;
}

export const useMockHealthData = () => {
  const [weightData] = useState<WeightData[]>([
    { date: '01/01', real: 82, target: 80 },
    { date: '08/01', real: 81.5, target: 79.5 },
    { date: '15/01', real: 81, target: 79 },
    { date: '22/01', real: 80.2, target: 78.5 },
    { date: '29/01', real: 79.8, target: 78 },
    { date: '05/02', real: 78, target: 75 },
  ]);

  const [activityData] = useState<ActivityData>({
    steps: 7542,
    goal: 10000,
    calories: 342,
  });

  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: { consumed: 1450, goal: 2200 },
    protein: { consumed: 85, goal: 130 },
    carbs: { consumed: 180, goal: 275 },
    fat: { consumed: 45, goal: 73 },
    hydration: { consumed: 1.5, goal: 2.5 },
  });

  const [todayWorkout] = useState<WorkoutSession>({
    id: '1',
    name: 'Cardio HIIT',
    duration: 30,
    exercises: 8,
    calories: 350,
    status: 'planned',
    exerciseList: ['Jumping jacks', 'Burpees', 'Mountain climbers', 'Squats'],
  });

  const [weekDays] = useState<WeekDay[]>([
    { day: 'Lundi', shortDay: 'Lun', status: 'completed' },
    { day: 'Mardi', shortDay: 'Mar', status: 'rest' },
    { day: 'Mercredi', shortDay: 'Mer', status: 'completed' },
    { day: 'Jeudi', shortDay: 'Jeu', status: 'today' },
    { day: 'Vendredi', shortDay: 'Ven', status: 'workout' },
    { day: 'Samedi', shortDay: 'Sam', status: 'upcoming' },
    { day: 'Dimanche', shortDay: 'Dim', status: 'upcoming' },
  ]);

  const [meals, setMeals] = useState<Meal[]>([
    { id: '1', type: 'breakfast', name: 'Petit-déjeuner', time: '08:00', calories: 450, description: 'Flocons d\'avoine, Banane, Lait d\'amande' },
    { id: '2', type: 'lunch', name: 'Déjeuner', time: '12:30', calories: 650, description: 'Poulet grillé, Riz complet, Légumes' },
    { id: '3', type: 'dinner', name: 'Dîner', time: '19:30', calories: 0, description: undefined },
    { id: '4', type: 'snack', name: 'Collations', time: '', calories: 350, description: 'Yaourt grec, Amandes' },
  ]);

  const [goals] = useState<Goal[]>([
    { id: '1', name: 'Poids cible', current: 78, target: 75, unit: 'kg', icon: 'arrow-down' },
    { id: '2', name: 'Séances/semaine', current: 3, target: 5, unit: '', icon: 'arrow-up' },
    { id: '3', name: 'Protéines/jour', current: 85, target: 130, unit: 'g', icon: 'arrow-up' },
  ]);

  const [personalRecords] = useState<PersonalRecord[]>([
    { id: '1', exercise: 'Développé couché', weight: 80, date: 'il y a 3 jours' },
    { id: '2', exercise: 'Squat', weight: 100, date: 'il y a 1 semaine' },
    { id: '3', exercise: 'Soulevé de terre', weight: 120, date: 'il y a 2 semaines' },
  ]);

  const [performanceStats] = useState({
    totalSessions: 45,
    totalTime: '32h 15min',
    totalCalories: 12500,
    currentStreak: 5,
  });

  const [userProfile] = useState<UserProfile>({
    name: 'Alexandre',
    email: 'alexandre@example.com',
    memberSince: 'Janvier 2024',
    height: 180,
    weight: 78,
    age: 28,
    bmi: 24.1,
    mainGoal: 'Prise de muscle',
  });

  const [machines] = useState<Machine[]>([
    { id: '1', name: 'Presse à cuisses', icon: 'dumbbell' },
    { id: '2', name: 'Tirage vertical', icon: 'dumbbell' },
    { id: '3', name: 'Développé couché', icon: 'dumbbell' },
    { id: '4', name: 'Rameur', icon: 'dumbbell' },
  ]);

  const [objectives] = useState([
    { id: '1', name: 'Perte de poids', icon: 'flame' },
    { id: '2', name: 'Prise de muscle', icon: 'dumbbell' },
    { id: '3', name: 'Endurance', icon: 'target' },
    { id: '4', name: 'Remise en forme', icon: 'heart' },
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'coach',
      content: 'Salut ! 👋 Je suis ton coach IA. Comment puis-je t\'aider aujourd\'hui ?',
      timestamp: new Date(Date.now() - 3600000 * 2),
    },
    {
      id: '2',
      sender: 'user',
      content: 'Je veux savoir où j\'en suis dans mes objectifs.',
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: '3',
      sender: 'coach',
      content: 'Tu fais du super travail ! 🎯 Tu as complété 3/5 séances cette semaine et tu es à 65% de ton objectif protéines. Continue comme ça !',
      timestamp: new Date(Date.now() - 1800000),
    },
  ]);

  const addMessage = (content: string, sender: 'user' | 'coach') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const addHydration = (amount: number) => {
    setNutritionData(prev => ({
      ...prev,
      hydration: { ...prev.hydration, consumed: prev.hydration.consumed + amount }
    }));
  };

  const currentWeight = weightData[weightData.length - 1]?.real || 0;
  const targetWeight = weightData[weightData.length - 1]?.target || 0;
  const weightDelta = (currentWeight - targetWeight).toFixed(1);
  const weeklySessionsCompleted = weekDays.filter(d => d.status === 'completed').length;
  const weeklySessionsTotal = 5;

  return {
    weightData,
    activityData,
    nutritionData,
    messages,
    addMessage,
    currentWeight,
    targetWeight,
    weightDelta,
    todayWorkout,
    weekDays,
    meals,
    goals,
    personalRecords,
    performanceStats,
    userProfile,
    machines,
    objectives,
    weeklySessionsCompleted,
    weeklySessionsTotal,
    addHydration,
  };
};
