-- Migration: Add is_active column and indexes for sessions table
-- Run this migration in Supabase SQL Editor

-- Step 1: Add is_active column for soft delete
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Update existing sessions to be active
UPDATE sessions SET is_active = true WHERE is_active IS NULL;

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_id_active 
  ON sessions(session_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sessions_user_id_active 
  ON sessions(user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_sessions_refresh_expiry 
  ON sessions(refresh_token_expires_at) WHERE is_active = true;

-- Optional: Add index for cleanup of expired sessions (for future cron job)
CREATE INDEX IF NOT EXISTS idx_sessions_inactive_cleanup 
  ON sessions(is_active, refresh_token_expires_at) WHERE is_active = false;
