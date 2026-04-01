-- Delete the 3 duplicate workout sessions from Feb 6
DELETE FROM workout_sessions WHERE id IN (
  '00d451cc-5bfd-4f30-97f9-89b2036c93b8',
  '6e10c9d3-bf93-4e0f-a3b3-0578a2a469f9',
  '65f0529d-b670-4544-9648-9367990874af'
);

-- Clean up activities table since all data has been migrated to workout_sessions
DELETE FROM activities WHERE id IN (
  SELECT a.id FROM activities a
  INNER JOIN workout_sessions ws ON a.activity_type = ws.workout_name 
    AND a.performed_at = ws.started_at 
    AND a.user_id = ws.user_id
);