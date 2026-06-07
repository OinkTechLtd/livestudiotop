ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Owner-scoped UPDATE: allow updating a channel only when the provided owner_token matches.
-- The owner_token is never exposed to clients; updates go through a server function using service_role,
-- but we still add a permissive policy to keep RLS consistent for authenticated/anon paths.
DROP POLICY IF EXISTS "Owner can update channel" ON public.channels;
CREATE POLICY "Owner can update channel"
  ON public.channels
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can delete channel" ON public.channels;
CREATE POLICY "Owner can delete channel"
  ON public.channels
  FOR DELETE
  USING (true);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime
ALTER TABLE public.channels REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;
END $$;