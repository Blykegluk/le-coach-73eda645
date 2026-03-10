-- Backfill: create activity rows for completed workout_sessions
-- that don't already have a matching entry in activities.
-- This ensures the Progress page (which reads only activities) shows all sessions.
INSERT INTO public.activities (user_id, activity_type, duration_min, calories_burned, distance_km, notes, performed_at)
SELECT
  ws.user_id,
  ws.workout_name,
  COALESCE(ws.total_duration_seconds / 60, 0),
  ws.calories_burned,
  ws.distance_km,
  ws.notes,
  ws.started_at
FROM public.workout_sessions ws
WHERE ws.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM public.activities a
    WHERE a.user_id = ws.user_id
      AND a.activity_type = ws.workout_name
      AND a.performed_at = ws.started_at
  );
