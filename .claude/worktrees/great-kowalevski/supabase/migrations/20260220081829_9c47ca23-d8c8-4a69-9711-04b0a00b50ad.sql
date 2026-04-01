-- Save user's training split preference permanently so the coach always reads it
INSERT INTO user_context (user_id, key, value)
VALUES (
  'e2366b03-22c2-4b53-8210-7101e0f0c5ad',
  'health_training_preference_split',
  '{"category":"training_preference","description":"L''utilisateur fait EXCLUSIVEMENT du split haut du corps / bas du corps. Il ne fait JAMAIS de full body. Toujours alterner : si la dernière séance était haut du corps, proposer bas du corps, et vice-versa.","severity":"critical"}'
)
ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();