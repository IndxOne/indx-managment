CREATE TABLE sync_snapshots (
  user_hash  TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sync_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_row" ON sync_snapshots
  FOR ALL
  USING (
    user_hash = (current_setting('request.headers', true)::json->>'x-user-hash')
  )
  WITH CHECK (
    user_hash = (current_setting('request.headers', true)::json->>'x-user-hash')
  );
