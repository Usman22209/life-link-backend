-- Migration: Remove urgency requirement and add required_date index & default
-- Description: Transition from static urgency (critical/high/normal) to exact required date and time

-- 1. Set default for required_date to 24 hours from now if not explicitly passed
ALTER TABLE public.blood_requests 
  ALTER COLUMN required_date SET DEFAULT (now() + interval '24 hours');

-- 2. Drop the NOT NULL and check constraints on urgency so it is no longer mandatory
ALTER TABLE public.blood_requests 
  DROP CONSTRAINT IF EXISTS blood_requests_urgency_check;

ALTER TABLE public.blood_requests 
  ALTER COLUMN urgency DROP NOT NULL;

ALTER TABLE public.blood_requests 
  ALTER COLUMN urgency SET DEFAULT NULL;

-- 3. Create performance index on required_date for fast deadline querying & sorting
CREATE INDEX IF NOT EXISTS idx_blood_requests_required_date 
  ON public.blood_requests (required_date);
