-- Analytics events table for tracking key user actions
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by event name and date
CREATE INDEX idx_analytics_events_name_date ON analytics_events (event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events (user_id, created_at DESC);

-- RLS: users can insert their own events, only service role can read all
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON analytics_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
