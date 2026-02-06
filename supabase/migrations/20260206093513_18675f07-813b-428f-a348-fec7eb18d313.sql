-- Correction: utiliser une seule instruction WITH (CTE) pour que keep_ids/delete_ids soient visibles

BEGIN;

WITH u AS (
  SELECT id AS user_id
  FROM auth.users
  WHERE email = 'anthony.bouskila@gmail.com'
  LIMIT 1
), bounds AS (
  SELECT
    (date_trunc('week', now() AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris') AS week_start,
    ((date_trunc('week', now() AT TIME ZONE 'Europe/Paris') + interval '7 days') AT TIME ZONE 'Europe/Paris') AS week_end
), keep_monday AS (
  SELECT ws.id
  FROM workout_sessions ws
  JOIN u ON u.user_id = ws.user_id
  JOIN bounds b ON true
  WHERE ws.started_at >= b.week_start
    AND ws.started_at < b.week_end
    AND ws.workout_name = 'Renforcement Post-Blocage & Mobilité Douce'
    AND EXTRACT(ISODOW FROM (ws.started_at AT TIME ZONE 'Europe/Paris')) = 1
  ORDER BY ws.started_at ASC
  LIMIT 1
), keep_wednesday AS (
  SELECT ws.id
  FROM workout_sessions ws
  JOIN u ON u.user_id = ws.user_id
  JOIN bounds b ON true
  WHERE ws.started_at >= b.week_start
    AND ws.started_at < b.week_end
    AND ws.workout_name = 'Séance Haut du Corps - Stabilité & Protection Lombaire'
    AND EXTRACT(ISODOW FROM (ws.started_at AT TIME ZONE 'Europe/Paris')) = 3
  ORDER BY ws.started_at ASC
  LIMIT 1
), keep_ids AS (
  SELECT id FROM keep_monday
  UNION
  SELECT id FROM keep_wednesday
), keep_count AS (
  SELECT COUNT(*)::int AS n FROM keep_ids
), update_keep AS (
  UPDATE workout_sessions ws
  SET
    status = 'completed',
    completed_at = COALESCE(ws.completed_at, ws.started_at),
    total_duration_seconds = COALESCE(ws.total_duration_seconds, 0)
  WHERE ws.id IN (SELECT id FROM keep_ids)
  RETURNING ws.id
), delete_ids AS (
  SELECT ws.id
  FROM workout_sessions ws
  JOIN u ON u.user_id = ws.user_id
  JOIN bounds b ON true
  WHERE ws.started_at >= b.week_start
    AND ws.started_at < b.week_end
    AND ws.id NOT IN (SELECT id FROM keep_ids)
    -- sécurité: on ne supprime que si on a bien trouvé les 2 séances à conserver
    AND (SELECT n FROM keep_count) = 2
), delete_logs AS (
  DELETE FROM workout_exercise_logs wel
  USING delete_ids d
  WHERE wel.session_id = d.id
  RETURNING wel.id
)
DELETE FROM workout_sessions ws
USING delete_ids d
WHERE ws.id = d.id;

COMMIT;