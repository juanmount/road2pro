-- Push Notification Tokens Table
-- Stores Expo push tokens for sending notifications to users

CREATE TABLE IF NOT EXISTS push_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_updated_at ON push_tokens(updated_at);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_tokens_updated_at 
BEFORE UPDATE ON push_tokens
FOR EACH ROW EXECUTE FUNCTION update_push_tokens_updated_at();

-- Add comment
COMMENT ON TABLE push_tokens IS 'Stores Expo push notification tokens for mobile app users';
