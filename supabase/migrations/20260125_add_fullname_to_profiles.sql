-- Run this in Supabase SQL Editor to add the missing name field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT;
