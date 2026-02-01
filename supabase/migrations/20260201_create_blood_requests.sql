-- Migration: Create blood_requests table
-- Description: Sets up the core blood request table with RLS, indexes, and constraints.

CREATE TABLE IF NOT EXISTS public.blood_requests (
  id uuid not null default gen_random_uuid(),
  requester_id uuid not null,
  patient_name text null,
  blood_group text not null,
  units_required integer not null default 1,
  fulfilled_units integer not null default 0,
  hospital_name text not null,
  hospital_address text null,
  city_id text null,
  latitude double precision null,
  longitude double precision null,
  urgency text not null default 'normal',
  contact_number text null,
  description text null,
  status text not null default 'open',
  is_verified boolean not null default false,
  required_date timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint blood_requests_pkey primary key (id),
  constraint blood_requests_requester_fkey
    foreign key (requester_id)
    references public.profiles (id)
    on delete cascade,
  constraint blood_requests_urgency_check
    check (urgency in ('critical', 'high', 'normal')),
  constraint blood_requests_status_check
    check (status in ('open', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests (status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests (blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_city ON public.blood_requests (city_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_created_at ON public.blood_requests (created_at);

-- Row Level Security
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can see open requests
CREATE POLICY "public_read_open_requests"
ON public.blood_requests FOR SELECT
USING (status = 'open');

-- Users can manage their own requests
CREATE POLICY "user_manage_own_requests"
ON public.blood_requests FOR ALL
USING (auth.uid() = requester_id)
WITH CHECK (auth.uid() = requester_id);

-- Automatic updated_at trigger
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_blood_requests_updated_at') THEN
        CREATE TRIGGER set_blood_requests_updated_at
        BEFORE UPDATE ON public.blood_requests
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
