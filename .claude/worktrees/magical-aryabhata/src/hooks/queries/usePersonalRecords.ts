import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const prKeys = {
  all: ['personal_records'] as const,
  byUser: (userId: string | undefined) => [...prKeys.all, userId] as const,
};

interface PersonalRecord {
  id: string;
  user_id: string;
  exercise_name: string;
  record_type: string;
  value: number;
  achieved_at: string;
  session_id: string | null;
}

export function usePersonalRecords(userId: string | undefined) {
  return useQuery({
    queryKey: prKeys.byUser(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return data as PersonalRecord[];
    },
    enabled: !!userId,
  });
}

interface PRCheck {
  exercise_name: string;
  weight: number;
  volume: number; // sets * reps * weight
}

/**
 * Detects and inserts new personal records.
 * Returns array of exercise names that set a new PR.
 */
export function useDetectPRs() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      sessionId,
      exercises,
    }: {
      userId: string;
      sessionId: string;
      exercises: PRCheck[];
    }) => {
      // Fetch existing PRs for these exercises
      const exerciseNames = exercises.map(e => e.exercise_name);
      const { data: existingPRs } = await supabase
        .from('personal_records')
        .select('*')
        .eq('user_id', userId)
        .in('exercise_name', exerciseNames);

      const prMap = new Map<string, Map<string, number>>();
      (existingPRs || []).forEach((pr: PersonalRecord) => {
        if (!prMap.has(pr.exercise_name)) prMap.set(pr.exercise_name, new Map());
        prMap.get(pr.exercise_name)!.set(pr.record_type, pr.value);
      });

      const newPRs: string[] = [];
      const toUpsert: Array<{
        user_id: string;
        exercise_name: string;
        record_type: string;
        value: number;
        achieved_at: string;
        session_id: string;
      }> = [];

      for (const ex of exercises) {
        if (ex.weight <= 0 && ex.volume <= 0) continue;

        const existing = prMap.get(ex.exercise_name);
        const currentMaxWeight = existing?.get('max_weight') || 0;
        const currentMaxVolume = existing?.get('max_volume') || 0;

        let isPR = false;

        if (ex.weight > currentMaxWeight) {
          isPR = true;
          toUpsert.push({
            user_id: userId,
            exercise_name: ex.exercise_name,
            record_type: 'max_weight',
            value: ex.weight,
            achieved_at: new Date().toISOString(),
            session_id: sessionId,
          });
        }

        if (ex.volume > currentMaxVolume) {
          isPR = true;
          toUpsert.push({
            user_id: userId,
            exercise_name: ex.exercise_name,
            record_type: 'max_volume',
            value: ex.volume,
            achieved_at: new Date().toISOString(),
            session_id: sessionId,
          });
        }

        if (isPR) newPRs.push(ex.exercise_name);
      }

      if (toUpsert.length > 0) {
        // Delete existing records that will be replaced
        for (const rec of toUpsert) {
          await supabase
            .from('personal_records')
            .delete()
            .eq('user_id', userId)
            .eq('exercise_name', rec.exercise_name)
            .eq('record_type', rec.record_type);
        }
        await supabase.from('personal_records').insert(toUpsert);
      }

      return newPRs;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: prKeys.all }),
  });
}
