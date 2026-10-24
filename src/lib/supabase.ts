import { createClient } from '@supabase/supabase-js';

// User-provided Supabase project configuration
export const DEFAULT_SUPABASE_URL = 'https://easqggpdhjchngiezlah.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_LoOVkqjlndO4yqt7fLLO-Q_gxoQ97_Z';
export const DEFAULT_POSTGRES_CONNECTION_STRING =
  'postgresql://postgres:[YOUR-PASSWORD]@db.easqggpdhjchngiezlah.supabase.co:5432/postgres';

export const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const SUPABASE_POSTGRES_HOST = 'db.easqggpdhjchngiezlah.supabase.co:5432';

// Create Supabase client with auto refresh and session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Check if Supabase Auth & REST is reachable
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs?: number;
  user?: any;
}> {
  const start = performance.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    const latencyMs = Math.round(performance.now() - start);
    if (error) {
      return {
        connected: false,
        message: `Supabase Auth error: ${error.message}`,
        latencyMs
      };
    }
    return {
      connected: true,
      message: `Connected successfully to ${SUPABASE_URL} (${latencyMs}ms)`,
      latencyMs,
      user: data.session?.user || null
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: false,
      message: err?.message || 'Failed to connect to Supabase endpoint',
      latencyMs
    };
  }
}

// Modular SQL Table Definitions for Individual Copying
export const SQL_TABLES_BY_FEATURE: Record<string, { title: string; sql: string }> = {
  profiles: {
    title: '1. Profiles & Users',
    sql: `-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
  kind TEXT DEFAULT 'creator' CHECK (kind IN ('creator', 'watcher')),
  vibes TEXT[] DEFAULT '{}',
  is_teen BOOLEAN DEFAULT false,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, role, kind, vibes)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'kind', 'creator'),
    CASE 
      WHEN new.raw_user_meta_data->'vibes' IS NOT NULL 
      THEN ARRAY(SELECT json_array_elements_text(new.raw_user_meta_data->'vibes'))
      ELSE ARRAY['Dance', 'Music']::text[]
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`
  },

  stories: {
    title: '2. Your Story (24h Stories)',
    sql: `-- STORIES TABLE (24-Hour Stories)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  filter_name TEXT DEFAULT 'none',
  sound_name TEXT DEFAULT '',
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now() + interval '24 hours') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stories_user_expires ON public.stories(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories(expires_at);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Unexpired stories are viewable by everyone" ON public.stories FOR SELECT USING (expires_at > timezone('utc'::text, now()));
CREATE POLICY "Users can post their own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);`
  },

  follow: {
    title: '3. Follow & Following',
    sql: `-- FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT cannot_follow_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow creators" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow creators" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Auto maintain follow counts on profiles
CREATE OR REPLACE FUNCTION public.handle_follow_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    UPDATE public.profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change ON public.follows;
CREATE TRIGGER on_follow_change
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.handle_follow_change();`
  },

  likes: {
    title: '4. Likes (Clips & Posts)',
    sql: `-- LIKES TABLE
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, clip_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_clip ON public.likes(clip_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can like clips" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike clips" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Auto maintain likes_count on clips
CREATE OR REPLACE FUNCTION public.handle_like_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clips SET likes_count = likes_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clips SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_like_change();`
  },

  comments: {
    title: '5. Comments',
    sql: `-- COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_clip ON public.comments(clip_id, created_at ASC);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Auto maintain comments_count on clips
CREATE OR REPLACE FUNCTION public.handle_comment_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clips SET comments_count = comments_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clips SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_change();`
  },

  messaging: {
    title: '6. Messaging (Threads & Messages)',
    sql: `-- CHAT THREADS, PARTICIPANTS, MESSAGES & REQUESTS
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  title TEXT,
  last_message_text TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.thread_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  reactions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'seen')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.message_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(thread_id, to_user_id)
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view threads they belong to" ON public.chat_threads FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = chat_threads.id AND user_id = auth.uid()));
CREATE POLICY "Authenticated users can create chat threads" ON public.chat_threads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Participants can update chat thread timestamps" ON public.chat_threads FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = chat_threads.id AND user_id = auth.uid()));

CREATE POLICY "Users can view participants in their threads" ON public.thread_participants FOR SELECT 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = thread_participants.thread_id AND tp.user_id = auth.uid()));
CREATE POLICY "Users can join thread participants" ON public.thread_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update own thread participant state" ON public.thread_participants FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can read messages in their threads" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users can send messages to their threads" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users can update messages they participate in" ON public.messages FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));

CREATE POLICY "Users can view their own message requests" ON public.message_requests FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());
CREATE POLICY "Users can create message requests" ON public.message_requests FOR INSERT WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Recipients can respond to message requests" ON public.message_requests FOR UPDATE USING (to_user_id = auth.uid());

-- Auto update chat_threads.last_message_at
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger AS $$
BEGIN
  UPDATE public.chat_threads
  SET 
    last_message_text = new.content,
    last_message_at = new.created_at,
    updated_at = new.created_at
  WHERE id = new.thread_id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message();`
  }
};

// Full unified schema
export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- BLiN Social Platform: Unified Supabase Schema
-- Profiles, Your Story, Follows, Likes, Comments, Messaging, Clips
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

${SQL_TABLES_BY_FEATURE.profiles.sql}

${SQL_TABLES_BY_FEATURE.stories.sql}

${SQL_TABLES_BY_FEATURE.follow.sql}

-- CLIPS TABLE
CREATE TABLE IF NOT EXISTS public.clips (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  sound_name TEXT NOT NULL,
  tags TEXT DEFAULT '',
  filter_name TEXT DEFAULT 'none',
  sticker TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  views_count TEXT DEFAULT '1',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clips are viewable by everyone" ON public.clips FOR SELECT USING (true);
CREATE POLICY "Users can post clips" ON public.clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clips" ON public.clips FOR DELETE USING (auth.uid() = user_id);

${SQL_TABLES_BY_FEATURE.likes.sql}

${SQL_TABLES_BY_FEATURE.comments.sql}

${SQL_TABLES_BY_FEATURE.messaging.sql}
`;
