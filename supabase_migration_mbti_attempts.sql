-- Migration: refactor public.mbti_attempts
-- Run in Supabase SQL Editor. Keeps id, user_id, created_at; adds answers, type_probs, result_type;
-- migrates old type -> result_type; drops type, scores, test_version, result_hash; RLS + indexes.

-- 1) Add new columns
ALTER TABLE public.mbti_attempts
  ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS type_probs jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS result_type text;

-- 2) Migrate old data: type -> result_type, keep created_at
UPDATE public.mbti_attempts
SET result_type = type
WHERE type IS NOT NULL AND result_type IS NULL;

-- 3) Drop old columns
ALTER TABLE public.mbti_attempts DROP COLUMN IF EXISTS type;
ALTER TABLE public.mbti_attempts DROP COLUMN IF EXISTS scores;
ALTER TABLE public.mbti_attempts DROP COLUMN IF EXISTS test_version;
ALTER TABLE public.mbti_attempts DROP COLUMN IF EXISTS result_hash;

-- 4) RLS
ALTER TABLE public.mbti_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mbti_attempts_select_own" ON public.mbti_attempts;
CREATE POLICY "mbti_attempts_select_own" ON public.mbti_attempts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mbti_attempts_insert_own" ON public.mbti_attempts;
CREATE POLICY "mbti_attempts_insert_own" ON public.mbti_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "mbti_attempts_delete_own" ON public.mbti_attempts;
CREATE POLICY "mbti_attempts_delete_own" ON public.mbti_attempts
  FOR DELETE USING (auth.uid() = user_id);

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_mbti_attempts_user_id ON public.mbti_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_mbti_attempts_created_at ON public.mbti_attempts(created_at DESC);
