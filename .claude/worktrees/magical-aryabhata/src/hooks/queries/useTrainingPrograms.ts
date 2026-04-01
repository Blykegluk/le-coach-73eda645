import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TrainingProgram {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  goal: string;
  difficulty: string;
  duration_weeks: number;
  sessions_per_week: number;
  progression_rules: Json;
  current_week: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface ProgramWeek {
  id: string;
  program_id: string;
  user_id: string;
  week_number: number;
  focus: string | null;
  notes: string | null;
  is_deload: boolean;
}

export interface ProgramSession {
  id: string;
  program_id: string;
  week_id: string;
  user_id: string;
  session_order: number;
  day_of_week: number | null;
  workout_data: Json;
  completed_session_id: string | null;
  completed_at: string | null;
}

// ─── Query Keys ─────────────────────────────────────────────────────────────

export const programKeys = {
  all: ['programs'] as const,
  list: (userId: string) => [...programKeys.all, 'list', userId] as const,
  active: (userId: string) => [...programKeys.all, 'active', userId] as const,
  detail: (programId: string) => [...programKeys.all, 'detail', programId] as const,
  weeks: (programId: string) => [...programKeys.all, 'weeks', programId] as const,
  sessions: (weekId: string) => [...programKeys.all, 'sessions', weekId] as const,
  nextSession: (programId: string) => [...programKeys.all, 'nextSession', programId] as const,
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

/** List all programs for a user (active first, then by date) */
export function useTrainingPrograms(userId: string | undefined) {
  return useQuery({
    queryKey: programKeys.list(userId ?? ''),
    queryFn: async (): Promise<TrainingProgram[]> => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .eq('user_id', userId!)
        .order('status', { ascending: true }) // active first
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as TrainingProgram[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Get the currently active program */
export function useActiveProgram(userId: string | undefined) {
  return useQuery({
    queryKey: programKeys.active(userId ?? ''),
    queryFn: async (): Promise<TrainingProgram | null> => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .eq('user_id', userId!)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as TrainingProgram | null;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Get detailed view of a program with weeks */
export function useProgramDetail(programId: string | undefined) {
  return useQuery({
    queryKey: programKeys.detail(programId ?? ''),
    queryFn: async () => {
      const [programRes, weeksRes] = await Promise.all([
        supabase
          .from('training_programs')
          .select('*')
          .eq('id', programId!)
          .single(),
        supabase
          .from('program_weeks')
          .select('*')
          .eq('program_id', programId!)
          .order('week_number', { ascending: true }),
      ]);

      if (programRes.error) throw programRes.error;
      return {
        program: programRes.data as TrainingProgram,
        weeks: (weeksRes.data ?? []) as ProgramWeek[],
      };
    },
    enabled: !!programId,
    staleTime: 60_000,
  });
}

/** Get sessions for a specific week */
export function useProgramWeekSessions(weekId: string | undefined) {
  return useQuery({
    queryKey: programKeys.sessions(weekId ?? ''),
    queryFn: async (): Promise<ProgramSession[]> => {
      const { data, error } = await supabase
        .from('program_sessions')
        .select('*')
        .eq('week_id', weekId!)
        .order('session_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ProgramSession[];
    },
    enabled: !!weekId,
    staleTime: 60_000,
  });
}

/** Get the next uncompleted session in the active program's current week */
export function useNextProgramSession(userId: string | undefined, programId: string | undefined, currentWeek: number | undefined) {
  return useQuery({
    queryKey: programKeys.nextSession(programId ?? ''),
    queryFn: async (): Promise<{ session: ProgramSession; week: ProgramWeek } | null> => {
      // Get the current week
      const { data: weekData, error: weekError } = await supabase
        .from('program_weeks')
        .select('*')
        .eq('program_id', programId!)
        .eq('week_number', currentWeek!)
        .single();

      if (weekError || !weekData) return null;

      // Get the first uncompleted session in this week
      const { data: sessionData, error: sessionError } = await supabase
        .from('program_sessions')
        .select('*')
        .eq('week_id', weekData.id)
        .is('completed_at', null)
        .order('session_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (sessionError || !sessionData) {
        // All sessions done for this week — check if there's a next week
        const nextWeekNum = (currentWeek ?? 1) + 1;
        const { data: nextWeek } = await supabase
          .from('program_weeks')
          .select('*')
          .eq('program_id', programId!)
          .eq('week_number', nextWeekNum)
          .single();

        if (!nextWeek) return null; // program complete

        const { data: nextSession } = await supabase
          .from('program_sessions')
          .select('*')
          .eq('week_id', nextWeek.id)
          .is('completed_at', null)
          .order('session_order', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!nextSession) return null;
        return { session: nextSession as ProgramSession, week: nextWeek as ProgramWeek };
      }

      return { session: sessionData as ProgramSession, week: weekData as ProgramWeek };
    },
    enabled: !!userId && !!programId && currentWeek != null,
    staleTime: 30_000,
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────

/** Generate a new program via edge function */
export function useGenerateProgram(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      goal?: string;
      difficulty?: string;
      duration_weeks?: number;
      sessions_per_week?: number;
      focus_areas?: string;
      equipment?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await supabase.functions.invoke('generate-program', {
        body: params,
      });

      if (res.error) throw res.error;
      return res.data as { program_id: string; program: Record<string, unknown> };
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: programKeys.list(userId) });
        queryClient.invalidateQueries({ queryKey: programKeys.active(userId) });
      }
    },
  });
}

/** Mark a program session as completed + auto-advance week if all sessions done */
export function useCompleteProgramSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, workoutSessionId }: { sessionId: string; workoutSessionId: string }) => {
      // 1. Mark the session as completed
      const { error } = await supabase
        .from('program_sessions')
        .update({
          completed_session_id: workoutSessionId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      // 2. Auto-advance: check if all sessions in current week are done
      const { data: session } = await supabase
        .from('program_sessions')
        .select('program_id, week_id')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const { data: program } = await supabase
        .from('training_programs')
        .select('id, current_week, duration_weeks, status')
        .eq('id', session.program_id)
        .single();

      if (!program || program.status !== 'active') return;

      // Get current week's ID
      const { data: currentWeek } = await supabase
        .from('program_weeks')
        .select('id')
        .eq('program_id', program.id)
        .eq('week_number', program.current_week)
        .single();

      if (!currentWeek) return;

      // Check remaining sessions in current week
      const { data: remaining } = await supabase
        .from('program_sessions')
        .select('id')
        .eq('week_id', currentWeek.id)
        .is('completed_at', null);

      if (remaining && remaining.length === 0) {
        // All sessions done — advance week or complete program
        if (program.current_week >= program.duration_weeks) {
          await supabase.from('training_programs').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          }).eq('id', program.id);
        } else {
          await supabase.from('training_programs').update({
            current_week: program.current_week + 1,
          }).eq('id', program.id);
        }
      }
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: programKeys.all });
      }
    },
  });
}

/** Skip/mark a program session as already done (no linked workout) */
export function useSkipProgramSession(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await supabase
        .from('program_sessions')
        .update({
          completed_at: new Date().toISOString(),
          completed_session_id: null,
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Auto-advance week check (same logic as useCompleteProgramSession)
      const { data: session } = await supabase
        .from('program_sessions')
        .select('program_id, week_id')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const { data: program } = await supabase
        .from('training_programs')
        .select('id, current_week, duration_weeks, status')
        .eq('id', session.program_id)
        .single();

      if (!program || program.status !== 'active') return;

      const { data: currentWeek } = await supabase
        .from('program_weeks')
        .select('id')
        .eq('program_id', program.id)
        .eq('week_number', program.current_week)
        .single();

      if (!currentWeek) return;

      const { data: remaining } = await supabase
        .from('program_sessions')
        .select('id')
        .eq('week_id', currentWeek.id)
        .is('completed_at', null);

      if (remaining && remaining.length === 0) {
        if (program.current_week >= program.duration_weeks) {
          await supabase.from('training_programs').update({
            status: 'completed', completed_at: new Date().toISOString(),
          }).eq('id', program.id);
        } else {
          await supabase.from('training_programs').update({
            current_week: program.current_week + 1,
          }).eq('id', program.id);
        }
      }
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: programKeys.all });
      }
    },
  });
}

/** Update program status or current week */
export function useUpdateProgram(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ programId, updates }: {
      programId: string;
      updates: { status?: string; current_week?: number; completed_at?: string };
    }) => {
      const { error } = await supabase
        .from('training_programs')
        .update(updates)
        .eq('id', programId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: programKeys.all });
      }
    },
  });
}

/** Advance program to next week (if all sessions completed) */
export function useAdvanceProgramWeek(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ programId, currentWeek, totalWeeks }: {
      programId: string;
      currentWeek: number;
      totalWeeks: number;
    }) => {
      if (currentWeek >= totalWeeks) {
        // Program complete
        const { error } = await supabase
          .from('training_programs')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', programId);
        if (error) throw error;
        return { completed: true };
      }

      const { error } = await supabase
        .from('training_programs')
        .update({ current_week: currentWeek + 1 })
        .eq('id', programId);
      if (error) throw error;
      return { completed: false, newWeek: currentWeek + 1 };
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: programKeys.all });
      }
    },
  });
}

// ─── Realtime Invalidation ──────────────────────────────────────────────────

export function useProgramRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('programs_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'training_programs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: programKeys.all });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'program_sessions',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: programKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
