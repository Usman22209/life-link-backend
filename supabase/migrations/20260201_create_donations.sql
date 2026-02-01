-- Migration: Create donations table
-- Description: Tracks donor intent and fulfillment for blood requests.

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid not null default gen_random_uuid(),
  request_id uuid not null,
  donor_id uuid not null,
  status text not null default 'intent', -- 'intent', 'completed', 'cancelled'
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint donations_pkey primary key (id),
  constraint donations_request_fkey 
    foreign key (request_id) references public.blood_requests (id) on delete cascade,
  constraint donations_donor_fkey 
    foreign key (donor_id) references public.profiles (id) on delete cascade,
  constraint donations_status_check 
    check (status in ('intent', 'completed', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_donations_request_id ON public.donations (request_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations (donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations (status);

-- Row Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Requester can view all donations for their request
CREATE POLICY "requester_view_donations"
ON public.donations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.blood_requests
    WHERE id = donations.request_id AND requester_id = auth.uid()
  )
);

-- Donors can view their own donation records
CREATE POLICY "donor_view_own_donations"
ON public.donations FOR SELECT
USING (donor_id = auth.uid());

-- Donors can create their own donation records
CREATE POLICY "donor_create_donations"
ON public.donations FOR INSERT
WITH CHECK (donor_id = auth.uid());

-- Donors can cancel their intent
CREATE POLICY "donor_update_own_donations"
ON public.donations FOR UPDATE
USING (donor_id = auth.uid())
WITH CHECK (donor_id = auth.uid());

-- Requester can mark a donation as completed
CREATE POLICY "requester_complete_donation"
ON public.donations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.blood_requests
    WHERE id = donations.request_id AND requester_id = auth.uid()
  )
);

-- Automatic updated_at trigger
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_donations_updated_at') THEN
        CREATE TRIGGER set_donations_updated_at
        BEFORE UPDATE ON public.donations
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    END IF;
END $$;
