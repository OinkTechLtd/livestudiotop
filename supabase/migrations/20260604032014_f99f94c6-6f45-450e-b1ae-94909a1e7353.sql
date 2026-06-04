
CREATE TABLE public.channels (
  id TEXT NOT NULL PRIMARY KEY,
  title TEXT,
  stream_url TEXT NOT NULL,
  stream_type TEXT NOT NULL DEFAULT 'auto',
  scheduled_at TIMESTAMPTZ,
  owner_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT (id, title, stream_url, stream_type, scheduled_at, created_at) ON public.channels TO anon, authenticated;
GRANT INSERT ON public.channels TO anon, authenticated;
GRANT ALL ON public.channels TO service_role;

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view channels" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Anyone can create channels" ON public.channels FOR INSERT WITH CHECK (true);

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_channel ON public.messages (channel_id, created_at);

GRANT SELECT, INSERT ON public.messages TO anon, authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Anyone can post messages" ON public.messages FOR INSERT WITH CHECK (
  char_length(body) > 0 AND char_length(body) <= 500 AND char_length(author_name) <= 40
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
