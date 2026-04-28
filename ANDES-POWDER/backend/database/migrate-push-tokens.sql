-- Migration: Add 'active' column to existing push_tokens table
-- Run this if you get error: column "active" does not exist

-- Add active column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'active'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN active BOOLEAN DEFAULT true;
    COMMENT ON COLUMN push_tokens.active IS 'Whether this token is still active';
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'push_tokens' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
    COMMENT ON COLUMN push_tokens.updated_at IS 'Last time this token was updated';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON push_tokens(updated_at);

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set all existing tokens as active
UPDATE push_tokens SET active = true WHERE active IS NULL;

SELECT 'Migration completed successfully!' as status;
