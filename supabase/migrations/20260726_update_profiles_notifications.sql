-- Migration: Update profiles table with notification & device settings
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS device_token TEXT,
  ADD COLUMN IF NOT EXISTS device_platform TEXT;
