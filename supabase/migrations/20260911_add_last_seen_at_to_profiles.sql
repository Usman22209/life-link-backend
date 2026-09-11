-- Migration: Add last_seen_at column to profiles for tracking active presence
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
