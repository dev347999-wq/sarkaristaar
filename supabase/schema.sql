-- Supabase Schema Migration for SSC-CGL Platform
-- Run this in your Supabase SQL Editor

-- 1. Setup Public Profile table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profile trigger on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ language plpgsql security definer;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Test Attempts Table
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text not null,
  test_title text not null,
  category text not null,
  score numeric not null,
  total_marks numeric not null,
  accuracy numeric not null,
  time_spent_str text not null,
  answers jsonb not null default '{}'::jsonb,
  language text,
  date_completed timestamp with time zone default timezone('utc'::text, now()) not null,
  test_uploaded_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_test_attempts_user_id ON public.test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test_id ON public.test_attempts(test_id);

-- 3. Saved Questions Table
CREATE TABLE IF NOT EXISTS public.saved_questions (
  question_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text not null,
  topic text not null,
  question_text text not null,
  question_hindi text,
  options jsonb not null default '[]'::jsonb,
  options_hindi jsonb default '[]'::jsonb,
  correct_answer text not null,
  answer_hindi text,
  user_notes text,
  image_url text,
  saved_at timestamp with time zone default timezone('utc'::text, now()) not null,
  explanation text,
  explanation_hindi text
);

CREATE INDEX IF NOT EXISTS idx_saved_questions_user_id ON public.saved_questions(user_id);

-- 4. Notes Table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text not null,
  content text not null,
  subject text not null,
  topic text not null,
  last_modified timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);

-- 5. Mock Tests Table
CREATE TABLE IF NOT EXISTS public.mock_tests (
  id text PRIMARY KEY,
  test_name text,
  paper_name text,
  is_locked boolean default false,
  last_uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  metadata jsonb default '{}'::jsonb
);

-- Mock Test Questions (subcollection chunk equivalent)
CREATE TABLE IF NOT EXISTS public.mock_test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  chunk_index integer default 0,
  questions jsonb not null default '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_mock_test_questions_test_id ON public.mock_test_questions(test_id);

-- 6. Practice Questions Table
CREATE TABLE IF NOT EXISTS public.practice_questions (
  id text PRIMARY KEY, -- subjectSlug_topicSlug
  subject_slug text not null,
  topic_slug text not null,
  questions_data jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Purchases Table
CREATE TABLE IF NOT EXISTS public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id text not null,
  order_id text,
  payment_id text,
  amount numeric,
  date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON public.purchases(user_id);

-- Enable RLS (Row Level Security) and Policies - highly recommended for production
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own data
CREATE POLICY "Users can manage their own profiles" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage their own test_attempts" ON public.test_attempts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own saved_questions" ON public.saved_questions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own notes" ON public.notes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read their own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
-- Admins handles mock_tests & practice_questions, read-only for public/authenticated
CREATE POLICY "Mock tests are viewable by all" ON public.mock_tests FOR SELECT USING (true);
CREATE POLICY "Mock test questions are viewable by all" ON public.mock_test_questions FOR SELECT USING (true);
CREATE POLICY "Practice questions are viewable by all" ON public.practice_questions FOR SELECT USING (true);

-- Provide anon access to create purchases (or restrict to service role, depending on webhook implementation)
CREATE POLICY "Anyone can insert purchases" ON public.purchases FOR INSERT WITH CHECK (true);
-- Give admin blanket access. For a simple setup without explicit role tracking, we just allow inserts. Ensure more strict RLS based on your admin schema.
CREATE POLICY "Admins can manage mock tests" ON public.mock_tests FOR ALL USING (true);
CREATE POLICY "Admins can manage mock test questions" ON public.mock_test_questions FOR ALL USING (true);
CREATE POLICY "Admins can manage practice questions" ON public.practice_questions FOR ALL USING (true);
