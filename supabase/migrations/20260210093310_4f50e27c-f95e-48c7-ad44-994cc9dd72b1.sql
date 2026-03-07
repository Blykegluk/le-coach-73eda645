-- ⚠️ ONE-TIME DATA FIX — NE PAS REPRODUIRE
-- Suppression de messages pour un user spécifique. Ne pas utiliser de migrations pour les opérations de données.
DELETE FROM chat_messages WHERE user_id = '0fffacba-fe0a-40ea-8f94-75bb7e6098c2';