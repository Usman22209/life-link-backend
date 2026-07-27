-- Migration: Create FAQs and Support Tickets tables

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT faqs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  ticket_number text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read faqs"
  ON public.faqs FOR SELECT
  USING (true);

CREATE POLICY "Users insert support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users read own tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);
