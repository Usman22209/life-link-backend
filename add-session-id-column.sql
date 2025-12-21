-- Add session_id column to sessions table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.sessions
ADD COLUMN session_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid();

-- Optional: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.sessions(session_id);
