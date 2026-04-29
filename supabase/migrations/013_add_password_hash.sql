ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users can only read own password_hash" ON profiles;
CREATE POLICY "users can only read own password_hash"
  ON profiles FOR SELECT
  USING (auth.uid()::text = id::text OR password_hash IS NULL);
