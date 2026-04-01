import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Workout } from '@/components/training/NextWorkoutCard';

interface WorkoutContextType {
  generatedWorkout: Workout | null;
  setGeneratedWorkout: (workout: Workout | null) => void;
  clearWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const [generatedWorkout, setGeneratedWorkout] = useState<Workout | null>(null);

  const clearWorkout = useCallback(() => {
    setGeneratedWorkout(null);
  }, []);

  return (
    <WorkoutContext.Provider value={{ generatedWorkout, setGeneratedWorkout, clearWorkout }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
};
