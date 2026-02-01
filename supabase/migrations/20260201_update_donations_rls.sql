-- Migration: Update donations RLS policies
-- Description: Ensures policies are strictly correct and handles the service role bypass correctly.

-- 1. Ensure RLS is enabled
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "requester_view_donations" ON public.donations;
DROP POLICY IF EXISTS "donor_view_own_donations" ON public.donations;
DROP POLICY IF EXISTS "donor_create_donations" ON public.donations;
DROP POLICY IF EXISTS "donor_update_own_donations" ON public.donations;
DROP POLICY IF EXISTS "requester_complete_donation" ON public.donations;

-- 3. Create permissive policies for the authenticated users

-- Anyone logged in can create a donation (logic is handled in the service)
CREATE POLICY "users_can_create_donations"
ON public.donations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view donations related to their requests or their own donations
CREATE POLICY "users_can_view_relevant_donations"
ON public.donations FOR SELECT
TO authenticated
USING (
  donor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.blood_requests
    WHERE id = donations.request_id AND requester_id = auth.uid()
  )
);

-- Users can update their own donation status (donors can cancel, requesters can complete)
CREATE POLICY "users_can_update_relevant_donations"
ON public.donations FOR UPDATE
TO authenticated
USING (
  donor_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.blood_requests
    WHERE id = donations.request_id AND requester_id = auth.uid()
  )
)
WITH CHECK (true);
