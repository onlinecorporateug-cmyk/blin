import { supabase, SUPABASE_URL } from './supabase';
import { Account, ChatMessage } from '../types';

/**
 * Robust Supabase Service for Profiles, Your Story, Follows, Likes, Comments, and Messaging
 */

// ==============================================================================
// 1. PROFILES & USERS
// ==============================================================================

export async function syncUserProfileToSupabase(account: Account): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      return { success: false, error: 'No active Supabase auth session' };
    }

    // 1. Primary canonical sync to public.users (Vercel user account record)
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      email: account.em || sessionData?.session?.user?.email || '',
      username: account.u,
      full_name: account.name,
      avatar_url: account.avatar || '',
      bio: account.bio || '',
      role: account.role || 'user',
      kind: account.kind || 'creator',
      vibes: account.vibes || [],
      is_teen: Boolean(account.teen),
      followers_count: account.fol || 0,
      signup_source: 'vercel',
      created_from_domain: typeof window !== 'undefined' ? window.location.hostname : 'vercel.app',
      last_sign_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (userError) {
      console.warn('Supabase users sync notice:', userError.message);
    }

    // 2. Secondary sync to public.profiles if table or view exists
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        username: account.u,
        full_name: account.name,
        avatar_url: account.avatar || null,
        bio: account.bio || '',
        role: account.role || 'user',
        kind: account.kind || 'creator',
        vibes: account.vibes || [],
        is_teen: Boolean(account.teen),
        followers_count: account.fol || 0,
        updated_at: new Date().toISOString()
      });
    } catch {
      // profiles view will reflect public.users automatically
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sync profile' };
  }
}

export async function fetchRemoteProfiles(): Promise<Account[]> {
  try {
    // 1. Query canonical public.users table
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!usersErr && usersData && usersData.length > 0) {
      return usersData.map((p: any) => ({
        u: p.username,
        name: p.full_name,
        em: p.email || '',
        pw: '',
        role: p.role || 'user',
        kind: p.kind || 'creator',
        vibes: p.vibes || [],
        teen: Boolean(p.is_teen),
        fol: p.followers_count || 0,
        bio: p.bio || '',
        avatar: p.avatar_url || undefined
      }));
    }

    // 2. Fallback to public.profiles if users is empty
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((p: any) => ({
      u: p.username,
      name: p.full_name,
      em: '',
      pw: '',
      role: p.role || 'user',
      kind: p.kind || 'creator',
      vibes: p.vibes || [],
      teen: Boolean(p.is_teen),
      fol: p.followers_count || 0,
      bio: p.bio || '',
      avatar: p.avatar_url || undefined
    }));
  } catch {
    return [];
  }
}

export async function resolveEmailFromHandle(handle: string): Promise<string | null> {
  try {
    const clean = handle.trim().toLowerCase().replace(/^@/, '');
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('username', clean)
      .maybeSingle();

    if (!error && data?.email) {
      return data.email;
    }
    return null;
  } catch {
    return null;
  }
}

// ==============================================================================
// 2. YOUR STORY (24-HOUR STORIES)
// ==============================================================================

export async function createStoryInSupabase(
  mediaUrl: string,
  caption: string = '',
  filterName: string = 'none',
  soundName: string = ''
): Promise<{ success: boolean; storyId?: string; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        caption,
        filter_name: filterName,
        sound_name: soundName
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, storyId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to upload story' };
  }
}

export async function fetchActiveStoriesFromSupabase(): Promise<any[]> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('stories')
      .select('id, user_id, media_url, caption, filter_name, sound_name, created_at, profiles(username, full_name, avatar_url)')
      .gt('expires_at', nowIso)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

// ==============================================================================
// 3. FOLLOW & FOLLOWING
// ==============================================================================

export async function followUserInSupabase(followingUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const followerId = sessionData?.session?.user?.id;
    if (!followerId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: followingUserId
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Follow action failed' };
  }
}

export async function unfollowUserInSupabase(followingUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const followerId = sessionData?.session?.user?.id;
    if (!followerId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: followerId, following_id: followingUserId });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unfollow action failed' };
  }
}

// ==============================================================================
// 4. LIKES (CLIPS)
// ==============================================================================

export async function likeClipInSupabase(clipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase.from('likes').insert({
      user_id: userId,
      clip_id: clipId
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Like action failed' };
  }
}

export async function unlikeClipInSupabase(clipId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };

    const { error } = await supabase
      .from('likes')
      .delete()
      .match({ user_id: userId, clip_id: clipId });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unlike action failed' };
  }
}

// ==============================================================================
// 5. COMMENTS
// ==============================================================================

export async function addCommentToSupabase(
  clipId: string,
  content: string,
  username: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        clip_id: clipId,
        user_id: userId || null,
        username,
        content
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, commentId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Comment failed' };
  }
}

export async function fetchCommentsFromSupabase(clipId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('clip_id', clipId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

// ==============================================================================
// 6. MESSAGING
// ==============================================================================

export async function sendRemoteMessage(
  threadId: string,
  content: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated with Supabase' };

    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        sender_id: userId,
        content,
        status: 'sent',
        is_read: false
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error' };
  }
}

export async function fetchRemoteMessages(threadId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUserId = sessionData?.session?.user?.id;

    return data.map((m: any) => ({
      me: m.sender_id === currentUserId ? 1 : 0,
      t: m.content,
      tm: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      st: m.status || (m.is_read ? 'seen' : 'sent'),
      rx: m.reactions || []
    }));
  } catch {
    return [];
  }
}

// ==============================================================================
// 7. STATUS & CONNECTIVITY
// ==============================================================================

export async function checkSupabaseStatus(): Promise<{
  connected: boolean;
  url: string;
  authSession: boolean;
  userId?: string;
  latencyMs: number;
  message: string;
}> {
  const start = performance.now();
  try {
    const { data, error } = await supabase.auth.getSession();
    const latency = Math.round(performance.now() - start);

    if (error) {
      return {
        connected: false,
        url: SUPABASE_URL,
        authSession: false,
        latencyMs: latency,
        message: `Auth check: ${error.message}`
      };
    }

    return {
      connected: true,
      url: SUPABASE_URL,
      authSession: Boolean(data?.session),
      userId: data?.session?.user?.id,
      latencyMs: latency,
      message: `Successfully connected to ${SUPABASE_URL} (${latency}ms)`
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return {
      connected: false,
      url: SUPABASE_URL,
      authSession: false,
      latencyMs: latency,
      message: err?.message || 'Connection failed'
    };
  }
}
