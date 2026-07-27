-- Migration: Create chat_threads and chat_messages tables

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  donor_id uuid NOT NULL,
  last_message text NULL,
  last_message_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT chat_threads_pkey PRIMARY KEY (id),
  CONSTRAINT chat_threads_request_fkey FOREIGN KEY (request_id) REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  CONSTRAINT chat_threads_requester_fkey FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT chat_threads_donor_fkey FOREIGN KEY (donor_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),

  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_thread_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  CONSTRAINT chat_messages_sender_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes for chat query optimization
CREATE INDEX IF NOT EXISTS idx_chat_threads_requester ON public.chat_threads(requester_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_donor ON public.chat_threads(donor_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id);

-- Enable RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Permissive policies for chat threads and messages
DROP POLICY IF EXISTS "Public chat threads" ON public.chat_threads;
CREATE POLICY "Public chat threads" ON public.chat_threads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public chat messages" ON public.chat_messages;
CREATE POLICY "Public chat messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
