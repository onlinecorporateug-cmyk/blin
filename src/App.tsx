import React, { useState, useEffect, useRef } from 'react';
import { Account, Clip, Story, ChatThread, ReportItem, DraftItem, SettingsState } from './types';
import {
  INITIAL_ACCOUNTS,
  INITIAL_CLIPS,
  INITIAL_STORIES,
  INITIAL_THREADS,
  INITIAL_REPORTS,
  DEFAULT_SETTINGS,
  BOT_REPLIES
} from './data/mockData';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { HomeFeed } from './components/HomeFeed';
import { DiscoverView } from './components/DiscoverView';
import { StudioView } from './components/StudioView';
import { MessagesView } from './components/MessagesView';
import { ProfileView } from './components/ProfileView';
import { AdminView } from './components/AdminView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';
import { supabase } from './lib/supabase';
import {
  syncUserProfileToSupabase,
  createStoryInSupabase,
  likeClipInSupabase,
  unlikeClipInSupabase,
  addCommentToSupabase
} from './lib/supabaseService';

// Storage helper functions
const getStored = <T,>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota error in case of large media
  }
};

const FAKE_HANDLES = new Set([
  'jonathan_creator',
  'kevin_admin',
  'amara_groove',
  'kitomakesbeats',
  'zola_thrifted',
  'malik_skates',
  'amara',
  'kito',
  'zola',
  'malik'
]);

export default function App() {
  // Persistent Accounts (guaranteed real accounts only)
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const raw = getStored<Account[]>('blin_accounts', INITIAL_ACCOUNTS);
    return raw.filter((a) => a && a.u && !FAKE_HANDLES.has(a.u.toLowerCase()));
  });

  // Persistent Current User (defaults to null for real authentication)
  const [currentUser, setCurrentUser] = useState<Account | null>(() => {
    const raw = getStored<Account | null>('blin_current_user', null);
    if (raw && FAKE_HANDLES.has(raw.u.toLowerCase())) {
      return null;
    }
    return raw;
  });

  const [currentTab, setCurrentTab] = useState<string>('home');

  // Persistent Content
  const [clips, setClips] = useState<Clip[]>(() => {
    const raw = getStored<Clip[]>('blin_clips', INITIAL_CLIPS);
    return raw.filter((c) => c && c.h && !FAKE_HANDLES.has(c.h.toLowerCase()));
  });

  const [stories, setStories] = useState<Story[]>(() => {
    const raw = getStored<Story[]>('blin_stories', INITIAL_STORIES);
    return raw.filter((s) => s.you || !FAKE_HANDLES.has(s.n.toLowerCase()));
  });

  const [threads, setThreads] = useState<ChatThread[]>(() => {
    const raw = getStored<ChatThread[]>('blin_threads', INITIAL_THREADS);
    return raw.filter((t) => !FAKE_HANDLES.has(t.n.toLowerCase()));
  });

  const [reports, setReports] = useState<ReportItem[]>(() =>
    getStored('blin_reports', INITIAL_REPORTS)
  );

  const [drafts, setDrafts] = useState<DraftItem[]>(() =>
    getStored('blin_drafts', [])
  );

  const [settings, setSettings] = useState<SettingsState>(() =>
    getStored('blin_settings', DEFAULT_SETTINGS)
  );

  const [following, setFollowing] = useState<Record<string, boolean>>(() =>
    getStored('blin_following', {})
  );

  const [blockedUsers, setBlockedUsers] = useState<Record<string, boolean>>(() =>
    getStored('blin_blocked', {})
  );

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state to localStorage
  useEffect(() => {
    setStored('blin_accounts', accounts);
  }, [accounts]);

  useEffect(() => {
    if (currentUser) {
      setStored('blin_current_user', currentUser);
    } else {
      localStorage.removeItem('blin_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    setStored('blin_clips', clips);
  }, [clips]);

  useEffect(() => {
    setStored('blin_stories', stories);
  }, [stories]);

  useEffect(() => {
    setStored('blin_threads', threads);
  }, [threads]);

  useEffect(() => {
    setStored('blin_reports', reports);
  }, [reports]);

  useEffect(() => {
    setStored('blin_drafts', drafts);
  }, [drafts]);

  useEffect(() => {
    setStored('blin_settings', settings);
  }, [settings]);

  useEffect(() => {
    setStored('blin_following', following);
  }, [following]);

  useEffect(() => {
    setStored('blin_blocked', blockedUsers);
  }, [blockedUsers]);

  const showToast = (message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Supabase Auth session listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !currentUser) {
        const meta = session.user.user_metadata || {};
        const u = meta.username || session.user.email?.split('@')[0] || 'blin_user';
        const found = accounts.find((a) => a.em === session.user.email || a.u === u);
        if (found) {
          setCurrentUser(found);
        } else {
          const newAcc: Account = {
            u,
            name: meta.full_name || session.user.email?.split('@')[0] || 'BLiN Member',
            em: session.user.email || '',
            pw: '',
            role: meta.role || 'user',
            kind: meta.kind || 'creator',
            vibes: meta.vibes || ['Dance', 'Music'],
            fol: 0,
            bio: meta.bio || 'Authenticated via Supabase'
          };
          setCurrentUser(newAcc);
          setAccounts((prev) => (prev.some((a) => a.u === u) ? prev : [...prev, newAcc]));
        }
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors
    }
    setCurrentUser(null);
    showToast('Logged out of BLiN');
  };

  // Screen time reminder
  useEffect(() => {
    if (!currentUser || settings.remind === 'Off') return;
    const minutes = {
      '30 min': 30,
      '1 hour': 60,
      '2 hours': 120
    }[settings.remind];

    if (!minutes) return;

    const interval = setInterval(() => {
      showToast(`⏰ ${settings.remind} on BLiN. Time to take a breather? 💚`);
    }, minutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser, settings.remind]);

  // Handle Tab Switch
  const handleTabChange = (tab: string) => {
    if (tab === 'admin' && currentUser?.role !== 'admin') return;
    setCurrentTab(tab);
    if (activeStoryIndex !== null) {
      setActiveStoryIndex(null);
    }
  };

  // Clips interactions
  const handleToggleLike = (clipIndex: number) => {
    setClips((prev) =>
      prev.map((clip, idx) => {
        if (idx === clipIndex) {
          const nextLiked = !clip.liked;
          if (clip.id) {
            if (nextLiked) {
              likeClipInSupabase(clip.id);
            } else {
              unlikeClipInSupabase(clip.id);
            }
          }
          return { ...clip, liked: nextLiked };
        }
        return clip;
      })
    );
  };

  const handleToggleSave = (clipIndex: number) => {
    setClips((prev) =>
      prev.map((clip, idx) => {
        if (idx === clipIndex) {
          const nextSaved = !clip.saved;
          showToast(nextSaved ? 'Saved to bookmarks 🌟' : 'Removed from saved');
          return { ...clip, saved: nextSaved };
        }
        return clip;
      })
    );
  };

  const handleToggleFollow = (handle: string) => {
    setFollowing((prev) => {
      const next = !prev[handle];
      showToast(next ? `Following @${handle} 🔥` : `Unfollowed @${handle}`);
      return { ...prev, [handle]: next };
    });
  };

  const handleAddComment = (clipIndex: number, commentText: string) => {
    if (!currentUser) return;
    const clip = clips[clipIndex];
    if (clip?.id) {
      addCommentToSupabase(clip.id, commentText, currentUser.u);
    }
    setClips((prev) =>
      prev.map((c, idx) => {
        if (idx === clipIndex) {
          return {
            ...c,
            cm: [...c.cm, [currentUser.u, commentText, 1]]
          };
        }
        return c;
      })
    );
    showToast('Comment posted ✨');
  };

  const handleDeleteComment = (clipIndex: number, commentIndex: number) => {
    setClips((prev) =>
      prev.map((clip, idx) => {
        if (idx === clipIndex) {
          const updatedCm = clip.cm.filter((_, cIdx) => cIdx !== commentIndex);
          return { ...clip, cm: updatedCm };
        }
        return clip;
      })
    );
    showToast('Comment deleted');
  };

  // Studio actions
  const handlePostClip = (newClipData: {
    caption: string;
    imageKey: string;
    filter: string;
    sticker: string;
    soundName: string;
    tags?: string;
  }) => {
    if (!currentUser) return;
    const created: Clip = {
      id: `c_${Date.now()}`,
      t: newClipData.caption,
      n: currentUser.name,
      h: currentUser.u,
      i: newClipData.imageKey,
      l: 0,
      c: 0,
      v: '1',
      s: newClipData.soundName,
      tags: newClipData.tags || '#BLiNBoost #NewCreator',
      fl: newClipData.filter,
      sk: newClipData.sticker,
      cm: [],
      aud: settings.aud,
      nocm: settings.cmDef === 'Off'
    };

    setClips((prev) => [created, ...prev]);
    setCurrentTab('home');
    showToast('Posted! New Creator Boost is live 🚀');
  };

  const handleAddToStory = (storyData: {
    imageKey: string;
    filter: string;
    caption: string;
  }) => {
    const newStory: Story = {
      n: currentUser ? currentUser.name.split(' ')[0] : 'You',
      i: storyData.imageKey,
      fl: storyData.filter,
      x: storyData.caption
    };
    createStoryInSupabase(storyData.imageKey, storyData.caption, storyData.filter);
    setStories((prev) => {
      const copy = [...prev];
      copy.splice(1, 0, newStory);
      return copy;
    });
    setCurrentTab('home');
    showToast('Added to your story ⭐');
  };

  const handleSaveDraft = (draft: DraftItem) => {
    setDrafts((prev) => [...prev, draft]);
    showToast('Draft saved in Creator Studio 📝');
  };

  // Chat actions
  const handleSendMessage = (threadIndex: number, text: string) => {
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setThreads((prev) =>
      prev.map((thread, idx) => {
        if (idx === threadIndex) {
          return {
            ...thread,
            m: [...thread.m, { me: 1, t: text, tm: timeNow, st: 'sent' }]
          };
        }
        return thread;
      })
    );

    // Simulate delivery
    setTimeout(() => {
      setThreads((prev) =>
        prev.map((thread, idx) => {
          if (idx === threadIndex) {
            const lastMsg = thread.m[thread.m.length - 1];
            if (lastMsg && lastMsg.me) lastMsg.st = 'del';
            return { ...thread };
          }
          return thread;
        })
      );
    }, 600);

    // Simulate seen & typing
    setTimeout(() => {
      setThreads((prev) =>
        prev.map((thread, idx) => {
          if (idx === threadIndex) {
            const lastMsg = thread.m[thread.m.length - 1];
            if (lastMsg && lastMsg.me) lastMsg.st = 'seen';
            return { ...thread, typing: 1 };
          }
          return thread;
        })
      );
    }, 1500);

    // Simulate incoming reply
    setTimeout(() => {
      const randomReply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setThreads((prev) =>
        prev.map((thread, idx) => {
          if (idx === threadIndex) {
            return {
              ...thread,
              typing: 0,
              m: [...thread.m, { t: randomReply, tm: replyTime }]
            };
          }
          return thread;
        })
      );
    }, 3200);
  };

  const handleStartNewChat = (name: string, imageKey: string) => {
    const existingIndex = threads.findIndex((t) => t.n.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      return;
    }
    const newThread: ChatThread = {
      n: name,
      i: imageKey,
      req: 0,
      u: 0,
      m: [{ t: `Hey ${name}! Loved your vibes on BLiN. Let's connect! 💚`, me: 1, tm: 'Just now', st: 'del' }]
    };
    setThreads((prev) => [newThread, ...prev]);
    showToast(`Conversation started with ${name}`);
  };

  const handleAcceptRequest = (threadIndex: number) => {
    setThreads((prev) =>
      prev.map((t, idx) => (idx === threadIndex ? { ...t, req: 0 } : t))
    );
    showToast('Message request accepted 🎉');
  };

  const handleDeclineRequest = (threadIndex: number) => {
    setThreads((prev) => prev.filter((_, idx) => idx !== threadIndex));
    showToast('Message request declined');
  };

  const handleToggleReaction = (threadIndex: number, messageIndex: number) => {
    setThreads((prev) =>
      prev.map((thread, idx) => {
        if (idx === threadIndex) {
          const target = thread.m[messageIndex];
          if (target) {
            target.r = target.r ? undefined : '❤️';
          }
          return { ...thread };
        }
        return thread;
      })
    );
  };

  const handleClearUnread = (threadIndex: number) => {
    setThreads((prev) =>
      prev.map((t, idx) => (idx === threadIndex ? { ...t, u: 0 } : t))
    );
  };

  // Clip deletion
  const handleDeleteClipByIndex = (clipIndex: number) => {
    setClips((prev) => prev.filter((_, idx) => idx !== clipIndex));
    showToast('Clip deleted');
  };

  const handleDeleteMyClipById = (clipId: string) => {
    setClips((prev) => prev.filter((c) => c.id !== clipId));
    showToast('Clip deleted from your profile');
  };

  // Admin moderation actions
  const handleToggleBan = (username: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.u === username && acc.role !== 'admin') {
          const nextBanned = !acc.banned;
          showToast(nextBanned ? `@${username} has been suspended 🛡️` : `@${username} restored`);
          return { ...acc, banned: nextBanned };
        }
        return acc;
      })
    );
  };

  const handleRemoveReportedClip = (handle: string, reportId: number) => {
    setClips((prev) => prev.filter((c) => c.h !== handle));
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    showToast(`Violating clip from @${handle} removed 🛡️`);
  };

  const handleDismissReport = (reportId: number) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    showToast('Report dismissed');
  };

  // Settings actions
  const handleChangePassword = (currentPw: string, newPw: string) => {
    if (!currentUser) return { success: false, message: 'No active session' };
    if (currentUser.pw !== currentPw) {
      return { success: false, message: 'Current password is incorrect' };
    }
    const updated = { ...currentUser, pw: newPw };
    setCurrentUser(updated);
    setAccounts((prev) => prev.map((a) => (a.u === updated.u ? updated : a)));
    showToast('Password updated successfully ✓');
    return { success: true, message: 'Password updated successfully' };
  };

  const handleDeactivateAccount = () => {
    if (!currentUser) return;
    const updated = { ...currentUser, deact: true };
    setAccounts((prev) => prev.map((a) => (a.u === updated.u ? updated : a)));
    setCurrentUser(null);
    showToast('Account deactivated. Log in to reactivate.');
  };

  const handleDeleteAccount = (usernameConfirm: string) => {
    if (!currentUser) return { success: false, message: 'No active user' };
    if (usernameConfirm.trim().toLowerCase() !== currentUser.u.toLowerCase()) {
      return { success: false, message: 'Username confirmation does not match.' };
    }

    setAccounts((prev) => prev.filter((a) => a.u !== currentUser.u));
    setClips((prev) => prev.filter((c) => c.h !== currentUser.u));
    setCurrentUser(null);
    showToast('Your account was permanently deleted.');
    return { success: true, message: 'Account deleted' };
  };

  const handleSendReport = (handle: string, reason: string) => {
    setReports((prev) => [
      ...prev,
      { id: Date.now(), h: handle, why: reason }
    ]);
    showToast('Report submitted to BLiN Safety 🛡️');
  };

  const handleSendSupport = (type: string, message: string) => {
    if (!currentUser) return;
    setReports((prev) => [
      ...prev,
      { id: Date.now(), h: currentUser.u, why: `${type}: ${message.slice(0, 70)}`, sup: 1 }
    ]);
    showToast('Message sent to BLiN support team 💚');
  };

  const handleClearCache = () => {
    setStories((prev) => prev.map((s) => ({ ...s, seen: undefined })));
    showToast('App cache cleared 🧹');
  };

  // Theme & Accessibility classes
  const themeClass = settings.theme === 'Light' ? 'tl' : '';
  const contrastClass = settings.hc ? 'hc' : '';
  const motionClass = settings.rm ? 'rm' : '';
  const zoomStyle = {
    '--zm': settings.txt === 'Small' ? 0.9 : settings.txt === 'Large' ? 1.15 : 1
  } as React.CSSProperties;

  const totalUnreadMessages = threads.reduce((sum, t) => sum + (t.u || 0), 0);
  const allCreatorHandles = Array.from(new Set(clips.map((c) => c.h))).filter(
    (h) => h !== currentUser?.u
  );

  return (
    <div
      className={`min-h-screen bg-[#050608] flex items-center justify-center p-0 md:p-4 select-none ${themeClass} ${contrastClass} ${motionClass}`}
      style={zoomStyle}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#22c55e] to-[#a3e635] text-[#04210f] font-extrabold text-xs px-4 py-2.5 rounded-full shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Mobile App Frame */}
      <div
        className={`w-full transition-all duration-300 relative ${
          isMobileFrame
            ? 'max-w-[440px] h-[100dvh] md:h-[840px] md:rounded-[36px] md:border-[10px] md:border-[#1e2821] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)]'
            : 'max-w-4xl h-[100dvh] md:h-[90vh] md:rounded-2xl border border-[#233128] overflow-hidden shadow-2xl'
        } bg-[var(--bg)] flex flex-col`}
      >
        {/* Top Header */}
        <Header
          user={currentUser}
          onLogout={handleLogout}
          isMobileFrame={isMobileFrame}
          onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
          onOpenSettings={() => setCurrentTab('settings')}
        />

        {/* Views */}
        {!currentUser ? (
          <AuthModal
            onLogin={(account) => {
              setCurrentUser(account);
              setCurrentTab('home');
              showToast(`Welcome back, ${account.name.split(' ')[0]} 💚`);
            }}
            onSignUp={(newAccount) => {
              setAccounts((prev) => [...prev, newAccount]);
              syncUserProfileToSupabase(newAccount);
              showToast(`Account created for @${newAccount.u} 🚀`);
            }}
            accounts={accounts}
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden zoom-content">
            {currentTab === 'home' && (
              <HomeFeed
                clips={clips}
                stories={stories}
                currentUser={currentUser}
                following={following}
                blockedUsers={blockedUsers}
                hiddenWords={settings.hid}
                isFilterWordsActive={Boolean(settings.hidOn)}
                onToggleLike={handleToggleLike}
                onToggleSave={handleToggleSave}
                onToggleFollow={handleToggleFollow}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                onDeleteClip={handleDeleteClipByIndex}
                onOpenCreateStory={() => setCurrentTab('studio')}
                onOpenStoryViewer={(index) => {
                  setActiveStoryIndex(index);
                  setStories((prev) =>
                    prev.map((s, idx) => (idx === index ? { ...s, seen: 1 } : s))
                  );
                }}
                activeStoryIndex={activeStoryIndex}
                onCloseStoryViewer={() => setActiveStoryIndex(null)}
                onNextStory={() => {
                  if (activeStoryIndex !== null) {
                    if (activeStoryIndex < stories.length - 1) {
                      setActiveStoryIndex(activeStoryIndex + 1);
                    } else {
                      setActiveStoryIndex(null);
                    }
                  }
                }}
                showToast={showToast}
              />
            )}

            {currentTab === 'disc' && (
              <DiscoverView
                clips={clips}
                currentHandle={currentUser.u}
                following={following}
                blockedUsers={blockedUsers}
                onToggleFollow={handleToggleFollow}
                onSelectClip={() => {
                  setCurrentTab('home');
                }}
              />
            )}

            {currentTab === 'studio' && (
              <StudioView
                onPostClip={handlePostClip}
                onAddToStory={handleAddToStory}
                onSaveDraft={handleSaveDraft}
              />
            )}

            {currentTab === 'msg' && (
              <MessagesView
                threads={threads}
                onSendMessage={handleSendMessage}
                onStartNewChat={handleStartNewChat}
                onAcceptRequest={handleAcceptRequest}
                onDeclineRequest={handleDeclineRequest}
                onToggleReaction={handleToggleReaction}
                onClearUnread={handleClearUnread}
                messagePrivacy={settings.cmWho}
                onUpdateMessagePrivacy={(val) =>
                  setSettings((prev) => ({ ...prev, cmWho: val }))
                }
                readReceipts={Boolean(settings.tfa || 1)}
                onUpdateReadReceipts={(val) =>
                  setSettings((prev) => ({ ...prev, tfa: val ? 1 : 0 }))
                }
              />
            )}

            {currentTab === 'prof' && (
              <ProfileView
                currentUser={currentUser}
                clips={clips}
                following={following}
                onUpdateProfile={(name, bio, avatar) => {
                  const updated: Account = {
                    ...currentUser,
                    name,
                    bio,
                    ...(avatar ? { avatar } : {})
                  };
                  setCurrentUser(updated);
                  setAccounts((prev) =>
                    prev.map((a) => (a.u === updated.u ? updated : a))
                  );
                  syncUserProfileToSupabase(updated);
                  showToast('Profile updated ✨');
                }}
                onOpenSettings={() => setCurrentTab('settings')}
                onSelectClip={() => setCurrentTab('home')}
                onDeleteMyClip={handleDeleteMyClipById}
                onLogout={handleLogout}
                totalMembersCount={accounts.length + 4}
              />
            )}

            {currentTab === 'admin' && currentUser.role === 'admin' && (
              <AdminView
                accounts={accounts}
                clips={clips}
                reports={reports}
                onToggleBan={handleToggleBan}
                onDeleteClip={handleDeleteClipByIndex}
                onRemoveReportedClip={handleRemoveReportedClip}
                onDismissReport={handleDismissReport}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                currentUser={currentUser}
                settings={settings}
                onUpdateSetting={(key, val) =>
                  setSettings((prev) => ({ ...prev, [key]: val }))
                }
                onBack={() => setCurrentTab('prof')}
                onLogout={handleLogout}
                drafts={drafts}
                onOpenDraft={(draftIndex) => {
                  setDrafts((prev) => prev.filter((_, idx) => idx !== draftIndex));
                  setCurrentTab('studio');
                }}
                onDeleteDraft={(draftIndex) => {
                  setDrafts((prev) => prev.filter((_, idx) => idx !== draftIndex));
                  showToast('Draft deleted');
                }}
                clips={clips}
                blockedUsers={blockedUsers}
                onToggleBlockUser={(handle) => {
                  setBlockedUsers((prev) => {
                    const next = !prev[handle];
                    showToast(next ? `@${handle} blocked` : `@${handle} unblocked`);
                    return { ...prev, [handle]: next };
                  });
                }}
                allCreators={allCreatorHandles}
                onChangePassword={handleChangePassword}
                onDeactivateAccount={handleDeactivateAccount}
                onDeleteAccount={handleDeleteAccount}
                onSendReport={handleSendReport}
                onSendSupport={handleSendSupport}
                onClearCache={handleClearCache}
                showToast={showToast}
              />
            )}
          </div>
        )}

        {/* Bottom Navigation */}
        {currentUser && (
          <Navigation
            currentTab={currentTab}
            onTabChange={handleTabChange}
            unreadMessagesCount={totalUnreadMessages}
            userRole={currentUser.role}
          />
        )}
      </div>
    </div>
  );
}
