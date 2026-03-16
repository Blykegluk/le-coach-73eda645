import { supabase } from '@/integrations/supabase/client';

type EventName =
  | 'page_view'
  | 'signup'
  | 'login'
  | 'workout_started'
  | 'workout_completed'
  | 'meal_logged'
  | 'program_created'
  | 'program_completed'
  | 'share_clicked'
  | 'coach_message_sent';

interface EventProperties {
  [key: string]: string | number | boolean | null;
}

/**
 * Track an analytics event to Supabase.
 * Fire-and-forget — never blocks the UI.
 */
export function trackEvent(name: EventName, properties?: EventProperties) {
  // Don't track in development
  if (import.meta.env.DEV) {
    console.debug('[Analytics]', name, properties);
    return;
  }

  const userId = supabase.auth.getSession().then(({ data }) => data.session?.user?.id);

  userId.then((uid) => {
    supabase
      .from('analytics_events')
      .insert({
        event_name: name,
        properties: properties ?? {},
        user_id: uid ?? null,
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) console.warn('[Analytics] Failed to track:', error.message);
      });
  });
}
