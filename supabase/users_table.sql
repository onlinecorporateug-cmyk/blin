-- ==============================================================================
-- BLiN Social Platform: The Canonical "users" Table
-- Target: Supabase (PostgreSQL) + Vercel Deployment
-- Project URL: https://easqggpdhjchngiezlah.supabase.co
-- SQL Editor: https://supabase.com/dashboard/project/easqggpdhjchngiezlah/sql
--
-- Features:
--   * Full integration with Supabase Auth (auth.users)
--   * Automatic sign-up trigger: extracts metadata & creates user on registration
--   * Optimized for Vercel production hosting & client authentication
--   * Row Level Security (RLS) configured for safe public feeds & self-management
--   * Realtime replication support for live profile & follower updates
--   * Backward-compatible view for queries expecting "public.profiles"
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CANONICAL USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  -- Linked directly to Supabase Auth account (auth.users)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Credentials & Identity
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  website TEXT DEFAULT '',
  
  -- Roles & Permissions
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'admin')),
  kind TEXT DEFAULT 'creator' CHECK (kind IN ('creator', 'watcher')),
  vibes TEXT[] DEFAULT ARRAY['Dance', 'Music']::TEXT[],
  
  -- Verification & Safety
  is_verified BOOLEAN DEFAULT false,
  is_teen BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Social Metrics
  followers_count INTEGER DEFAULT 0 CHECK (followers_count >= 0),
  following_count INTEGER DEFAULT 0 CHECK (following_count >= 0),
  posts_count INTEGER DEFAULT 0 CHECK (posts_count >= 0),
  
  -- Vercel Deployment & Auth Tracking
  signup_source TEXT DEFAULT 'vercel',
  created_from_domain TEXT DEFAULT 'vercel.app',
  last_sign_in_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_username_lower ON public.users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON public.users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_signup_source ON public.users(signup_source);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies
DROP POLICY IF EXISTS "Public can view active users" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.users;

-- Read policy: Anyone (logged in or anonymous) can view user profiles
CREATE POLICY "Public can view active users"
  ON public.users
  FOR SELECT
  USING (is_active = true OR auth.uid() = id);

-- Insert policy: Authenticated users can insert their own row
CREATE POLICY "Users can insert their own record"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Update policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Delete policy: Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.users
  FOR DELETE
  USING (auth.uid() = id);

-- ==============================================================================
-- 5. AUTOMATIC AUTH TRIGGER (SUPABASE AUTH -> PUBLIC.USERS)
-- When a user registers via Supabase Auth (on Vercel or locally), this function
-- automatically extracts user metadata and inserts a record into public.users.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_raw_meta JSONB := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_username TEXT;
  v_full_name TEXT;
  v_role TEXT;
  v_kind TEXT;
  v_source TEXT;
  v_domain TEXT;
  v_avatar TEXT;
  v_bio TEXT;
  v_vibes TEXT[];
BEGIN
  -- 1. Extract and sanitize username
  v_username := coalesce(
    v_raw_meta->>'username',
    v_raw_meta->>'user_name',
    split_part(NEW.email, '@', 1)
  );
  v_username := lower(regexp_replace(v_username, '[^a-zA-Z0-9_.]', '', 'g'));
  IF v_username IS NULL OR v_username = '' THEN
    v_username := 'user_' || substr(NEW.id::text, 1, 8);
  END IF;

  -- 2. Extract full name
  v_full_name := coalesce(
    v_raw_meta->>'full_name',
    v_raw_meta->>'name',
    v_username
  );

  -- 3. Validate role & kind
  v_role := coalesce(v_raw_meta->>'role', 'user');
  IF v_role NOT IN ('user', 'creator', 'admin') THEN
    v_role := 'user';
  END IF;

  v_kind := coalesce(v_raw_meta->>'kind', 'creator');
  IF v_kind NOT IN ('creator', 'watcher') THEN
    v_kind := 'creator';
  END IF;

  -- 4. Deployment origin metadata
  v_source := coalesce(v_raw_meta->>'signup_source', 'vercel');
  v_domain := coalesce(v_raw_meta->>'created_from_domain', 'vercel.app');
  v_avatar := coalesce(v_raw_meta->>'avatar_url', '');
  v_bio := coalesce(v_raw_meta->>'bio', 'Joined BLiN on Vercel');

  -- 5. Upsert into public.users
  INSERT INTO public.users (
    id,
    email,
    username,
    full_name,
    avatar_url,
    bio,
    role,
    kind,
    vibes,
    signup_source,
    created_from_domain,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_username,
    v_full_name,
    v_avatar,
    v_bio,
    v_role,
    v_kind,
    ARRAY['Dance', 'Music']::TEXT[],
    v_source,
    v_domain,
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_sign_in_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ==============================================================================
-- 6. AUTOMATIC TIMESTAMP UPDATER TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_users_updated_at();

-- ==============================================================================
-- 7. REALTIME SYNCHRONIZATION
-- ==============================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- ==============================================================================
-- 8. COMPATIBILITY LAYER FOR "public.profiles"
-- Resolves PostgreSQL ERROR 42809 ("profiles" is not a view).
-- When "public.profiles" already exists as a regular table in Supabase,
-- CREATE OR REPLACE VIEW fails because PostgreSQL cannot replace a table with a view.
--
-- This script:
--   1. Safely copies any existing records from public.profiles into public.users
--   2. Cleanly drops the old table or view
--   3. Creates the canonical compatibility view pointing to public.users
--   4. Re-points dependent foreign keys (clips, likes, comments) to public.users
-- ==============================================================================
DO $$
BEGIN
  -- If 'profiles' currently exists as a BASE TABLE:
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND table_type = 'BASE TABLE'
  ) THEN
    -- Safely copy any existing profile rows into public.users so no data is lost
    BEGIN
      INSERT INTO public.users (
        id, email, username, full_name, avatar_url, bio, website,
        role, kind, vibes, is_verified, is_teen, followers_count,
        following_count, posts_count, created_at, updated_at
      )
      SELECT 
        p.id,
        coalesce(au.email, p.username || '@user.blin.social'),
        p.username,
        coalesce(p.full_name, p.username),
        coalesce(p.avatar_url, ''),
        coalesce(p.bio, ''),
        coalesce(p.website, ''),
        coalesce(p.role, 'user'),
        coalesce(p.kind, 'creator'),
        coalesce(p.vibes, ARRAY['Dance', 'Music']::TEXT[]),
        coalesce(p.is_verified, false),
        coalesce(p.is_teen, false),
        coalesce(p.followers_count, 0),
        coalesce(p.following_count, 0),
        coalesce(p.posts_count, 0),
        coalesce(p.created_at, timezone('utc'::text, now())),
        coalesce(p.updated_at, timezone('utc'::text, now()))
      FROM public.profiles p
      LEFT JOIN auth.users au ON au.id = p.id
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        bio = EXCLUDED.bio,
        website = EXCLUDED.website;
    EXCEPTION
      WHEN others THEN
        NULL;
    END;

    -- Drop the table with CASCADE to clear any table lock or constraints
    DROP TABLE public.profiles CASCADE;

  -- If 'profiles' currently exists as a VIEW:
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles'
  ) THEN
    DROP VIEW public.profiles CASCADE;
  END IF;
END $$;

-- Create the canonical public.profiles view cleanly (zero 42809 error)
CREATE VIEW public.profiles AS
  SELECT
    id,
    email,
    username,
    full_name,
    avatar_url,
    bio,
    website,
    role,
    kind,
    vibes,
    is_verified,
    is_teen,
    followers_count,
    following_count,
    posts_count,
    created_at,
    updated_at
  FROM public.users;

-- Enable security invoker so RLS policies on public.users apply when querying profiles (PostgreSQL 15+)
DO $$
BEGIN
  ALTER VIEW public.profiles SET (security_invoker = true);
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

-- Re-link existing social feature foreign keys to public.users if those tables exist
DO $$
BEGIN
  -- Clips table foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clips') THEN
    BEGIN
      ALTER TABLE public.clips DROP CONSTRAINT IF EXISTS clips_user_id_fkey;
      ALTER TABLE public.clips ADD CONSTRAINT clips_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  -- Likes table foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'likes') THEN
    BEGIN
      ALTER TABLE public.likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
      ALTER TABLE public.likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  -- Comments table foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comments') THEN
    BEGIN
      ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
      ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;
