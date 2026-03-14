import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Workout } from '@/components/training/NextWorkoutCard';

const templateKeys = {
  all: ['workout_templates'] as const,
  list: (userId: string | undefined) => [...templateKeys.all, 'list', userId] as const,
};

export function useWorkoutTemplates(userId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.list(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useAddWorkoutTemplate(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, workout }: { name: string; workout: Workout }) => {
      const { error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: userId!,
          name,
          workout_data: workout as unknown as Record<string, unknown>,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.list(userId) }),
  });
}

export function useRemoveWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workout_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.all }),
  });
}
