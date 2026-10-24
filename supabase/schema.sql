-- ==============================================================================
-- BLiN Social Platform: Complete Production Supabase (PostgreSQL) Schema
-- Features: Profiles, Follows (Following), Posts/Clips, Likes, Comments, 
--           Messaging (Threads, Participants, Messages, Requests),
--           Stories (24-Hour Ephemeral), Saved Posts / Bookmarks & Notifications
-- Project URL: https://easqggpdhjchngiezlah.supabase.co
-- Connection URI: postgresql://postgres:[YOUR-PASSWORD]@db.easqggpdhjchngiezlah.supabase.co:5432/postgres
-- Instructions: Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/easqggpdhjchngiezlah/sql
-- ==============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. PROFILES (USER ACCOUNTS & CREATOR DETAILS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  website TEXT DEFAULT '',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
  kind TEXT DEFAULT 'creator' CHECK (kind IN ('creator', 'watcher')),
  vibes TEXT[] DEFAULT ARRAY['Dance', 'Music']::TEXT[],
  is_verified BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  is_teen BOOLEAN DEFAULT false,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON public.profiles(created_at DESC);

-- ==============================================================================
-- 2. FOLLOWS (FOLLOWING & FOLLOWER RELATIONSHIPS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT cannot_follow_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ==============================================================================
-- 3. POSTS / CLIPS (SHORT VIDEOS, AUDIO TRACKS & METADATA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clips (
  id TEXT PRIMARY KEY DEFAULT ('clip_' || gen_random_uuid()),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT DEFAULT '',
  media_url TEXT NOT NULL,
  cover_url TEXT DEFAULT '',
  sound_name TEXT DEFAULT 'Original Sound',
  sound_author TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  filter_name TEXT DEFAULT 'none',
  sticker TEXT DEFAULT NULL,
  duration NUMERIC DEFAULT 15.0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  saves_count INTEGER DEFAULT 0,
  views_count TEXT DEFAULT '0',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clips_user_id ON public.clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_created ON public.clips(created_at DESC);

-- Compatibility view / alias for standard 'posts' terminology
CREATE OR REPLACE VIEW public.posts AS
  SELECT 
    id,
    user_id,
    username,
    full_name,
    title,
    caption,
    media_url,
    cover_url,
    sound_name,
    tags,
    likes_count,
    comments_count,
    shares_count,
    saves_count,
    created_at
  FROM public.clips;

-- ==============================================================================
-- 4. LIKES (USER LIKES ON POSTS/CLIPS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, clip_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_clip ON public.likes(clip_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);

-- ==============================================================================
-- 5. COMMENTS (COMMENTS ON POSTS/CLIPS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE DEFAULT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_clip ON public.comments(clip_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);

-- ==============================================================================
-- 6. STORIES ("YOUR STORY" / 24-HOUR EPHEMERAL CONTENT)
-- ==============================================================================
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

-- ==============================================================================
-- 7. SAVED POSTS (USER BOOKMARKS / FAVORITES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE NOT NULL,
  collection_name TEXT DEFAULT 'All Posts',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, clip_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_posts_clip ON public.saved_posts(clip_id);

-- ==============================================================================
-- 8. MESSAGING: CHAT THREADS, PARTICIPANTS, MESSAGES & DIRECT REQUESTS
-- ==============================================================================

-- 8A. Chat Threads (1-on-1 or Group Conversations)
CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_group BOOLEAN DEFAULT false,
  title TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  last_message_text TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_last_msg ON public.chat_threads(last_message_at DESC);

-- 8B. Thread Participants
CREATE TABLE IF NOT EXISTS public.thread_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_parts_user ON public.thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_parts_thread ON public.thread_participants(thread_id);

-- 8C. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  media_url TEXT DEFAULT NULL,
  reactions JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'seen')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_order ON public.messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- 8D. Message Requests (DMs from non-connections)
CREATE TABLE IF NOT EXISTS public.message_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  preview_text TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(thread_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_msg_requests_to_user ON public.message_requests(to_user_id, status);

-- ==============================================================================
-- 9. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'message')),
  clip_id TEXT REFERENCES public.clips(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifs_recipient ON public.notifications(recipient_id, created_at DESC);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 10.1 Profiles RLS
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 10.2 Follows RLS
CREATE POLICY "Follows are viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow others" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 10.3 Clips / Posts RLS
CREATE POLICY "Clips are viewable by everyone" ON public.clips FOR SELECT USING (true);
CREATE POLICY "Users can insert clips" ON public.clips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clips" ON public.clips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clips" ON public.clips FOR DELETE USING (auth.uid() = user_id);

-- 10.4 Likes RLS
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can like clips" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike clips" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- 10.5 Comments RLS
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- 10.6 Stories RLS
CREATE POLICY "Unexpired stories are viewable by everyone" ON public.stories FOR SELECT USING (expires_at > timezone('utc'::text, now()));
CREATE POLICY "Users can post stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- 10.7 Saved Posts RLS
CREATE POLICY "Users can view own saved posts" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save posts" ON public.saved_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove saved posts" ON public.saved_posts FOR DELETE USING (auth.uid() = user_id);

-- 10.8 Messaging RLS
CREATE POLICY "Users view threads they participate in" ON public.chat_threads FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = chat_threads.id AND user_id = auth.uid()));
CREATE POLICY "Authenticated users create threads" ON public.chat_threads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Participants update threads" ON public.chat_threads FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = chat_threads.id AND user_id = auth.uid()));

CREATE POLICY "Users view participants in shared threads" ON public.thread_participants FOR SELECT 
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.thread_participants tp WHERE tp.thread_id = thread_participants.thread_id AND tp.user_id = auth.uid()));
CREATE POLICY "Authenticated users join thread participants" ON public.thread_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users update own participant state" ON public.thread_participants FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users read messages in their threads" ON public.messages FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users send messages to their threads" ON public.messages FOR INSERT 
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));
CREATE POLICY "Users update messages in their threads" ON public.messages FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.thread_participants WHERE thread_id = messages.thread_id AND user_id = auth.uid()));

CREATE POLICY "Users view relevant message requests" ON public.message_requests FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());
CREATE POLICY "Users create message requests" ON public.message_requests FOR INSERT WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "Recipients update message requests" ON public.message_requests FOR UPDATE USING (to_user_id = auth.uid());

-- 10.9 Notifications RLS
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "System/Users create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- ==============================================================================
-- 11. AUTOMATION TRIGGERS & FUNCTIONS
-- ==============================================================================

-- 11.1 Auto-create Profile on Supabase Auth Sign Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, role, kind, vibes)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    COALESCE(new.raw_user_meta_data->>'kind', 'creator'),
    CASE 
      WHEN new.raw_user_meta_data->'vibes' IS NOT NULL 
      THEN ARRAY(SELECT json_array_elements_text(new.raw_user_meta_data->'vibes'))
      ELSE ARRAY['Dance', 'Music']::text[]
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11.2 Maintain Followers and Following Counts
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_follow_change();

-- 11.3 Maintain Clip Likes Count
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_like_change();

-- 11.4 Maintain Clip Comments Count
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_comment_change();

-- 11.5 Maintain Saved Posts Count
CREATE OR REPLACE FUNCTION public.handle_save_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clips SET saves_count = saves_count + 1 WHERE id = NEW.clip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clips SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.clip_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_save_change ON public.saved_posts;
CREATE TRIGGER on_save_change
  AFTER INSERT OR DELETE ON public.saved_posts
  FOR EACH ROW EXECUTE PROCEDURE public.handle_save_change();

-- 11.6 Update Thread Timestamp and Snippet on New Message
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
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_message();

-- ==============================================================================
-- 12. SUPABASE REALTIME ENABLEMENT
-- Allows instant live sync for DMs, Likes, and New Posts
-- ==============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
