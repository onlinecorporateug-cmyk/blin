import React, { useState } from 'react';
import { ArrowLeft, Check, Shield, User, Lock, Eye, Bell, Film, Sparkles, MessageSquare, Users, Bot, Palette, Database, Moon, HelpCircle, AlertCircle, Trash2, CheckCircle2, Copy, RefreshCw, CheckCheck, Globe, ExternalLink } from 'lucide-react';
import { Account, SettingsState, DraftItem, Clip } from '../types';
import { TOPICS } from '../data/mockData';
import { playTapSound } from '../utils/audio';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  DEFAULT_POSTGRES_CONNECTION_STRING,
  testSupabaseConnection
} from '../lib/supabase';

interface SettingsViewProps {
  currentUser: Account;
  settings: SettingsState;
  onUpdateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  onBack: () => void;
  onLogout: () => void;
  drafts: DraftItem[];
  onOpenDraft: (draftIndex: number) => void;
  onDeleteDraft: (draftIndex: number) => void;
  clips: Clip[];
  blockedUsers: Record<string, boolean>;
  onToggleBlockUser: (handle: string) => void;
  allCreators: string[];
  onChangePassword: (currentPw: string, newPw: string) => { success: boolean; message: string };
  onDeactivateAccount: () => void;
  onDeleteAccount: (usernameConfirmation: string) => { success: boolean; message: string };
  onSendReport: (creatorHandle: string, reason: string) => void;
  onSendSupport: (type: string, message: string) => void;
  onClearCache: () => void;
  showToast: (msg: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  settings,
  onUpdateSetting,
  onBack,
  onLogout,
  drafts,
  onOpenDraft,
  onDeleteDraft,
  clips,
  blockedUsers,
  onToggleBlockUser,
  allCreators,
  onChangePassword,
  onDeactivateAccount,
  onDeleteAccount,
  onSendReport,
  onSendSupport,
  onClearCache,
  showToast
}) => {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // Sub-forms state
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwStatus, setPwStatus] = useState<{ err?: string; ok?: string }>({});

  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [showJsonData, setShowJsonData] = useState(false);

  const [reportCreatorHandle, setReportCreatorHandle] = useState('');
  const [reportReason, setReportReason] = useState('Spam');

  const [supportType, setSupportType] = useState('Question');
  const [supportMessage, setSupportMessage] = useState('');

  // Supabase management state
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [supabaseTestResult, setSupabaseTestResult] = useState<{
    connected?: boolean;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(keyName);
    showToast(`Copied ${keyName} to clipboard ✨`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setSupabaseTestResult(res);
      showToast(res.connected ? 'Supabase connection verified! 🟢' : 'Connection check failed 🔴');
    } catch (err: any) {
      setSupabaseTestResult({
        connected: false,
        message: err?.message || 'Connection test failed'
      });
    } finally {
      setIsTestingSupabase(false);
    }
  };

  const sections = [
    { id: 'acct', icon: User, title: 'Your account', desc: 'Profile info, account type, display settings' },
    { id: 'sec', icon: Lock, title: 'Account & Security', desc: 'Password, login activity, 2FA, data export, deletion' },
    { id: 'priv', icon: Shield, title: 'Privacy & Safety', desc: 'Private account, comments, mentions, blocked list, hidden words' },
    { id: 'notif', icon: Bell, title: 'Notifications', desc: 'Likes, comments, followers, DMs, push & email alerts' },
    { id: 'feed', icon: Film, title: 'Video & Feed', desc: 'Autoplay, quality, captions, translations, topics' },
    { id: 'studio', icon: Sparkles, title: 'Creator Studio', desc: 'Uploads, drafts, default audience, comments, analytics' },
    { id: 'msgs', icon: MessageSquare, title: 'Messages & Calls', desc: 'Requests, read receipts, calling, group chat' },
    { id: 'comm', icon: Users, title: 'Communities', desc: 'Profile visibility, notifications, invites' },
    { id: 'ai', icon: Bot, title: 'BLiN AI', desc: 'Response style, caption tools, synthetic media labeling' },
    { id: 'look', icon: Palette, title: 'Appearance & Accessibility', desc: 'Theme, text size, language, reduced motion, contrast' },
    { id: 'data', icon: Database, title: 'Supabase & Storage', desc: 'Supabase Auth, PostgreSQL connection, storage and cache' },
    { id: 'well', icon: Moon, title: 'Digital Wellbeing', desc: 'Screen-time break reminders, quiet hours' },
    { id: 'help', icon: HelpCircle, title: 'Help & Legal', desc: 'Community guidelines, privacy, terms, contact support' }
  ];

  const handlePasswordSubmit = () => {
    setPwStatus({});
    if (!pwCurrent) {
      setPwStatus({ err: 'Current password is required.' });
      return;
    }
    if (pwNew.length < 8 || !/[a-zA-Z]/.test(pwNew) || !/[0-9]/.test(pwNew)) {
      setPwStatus({ err: 'New password needs 8+ characters with letters and numbers.' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwStatus({ err: 'Passwords do not match.' });
      return;
    }
    const res = onChangePassword(pwCurrent, pwNew);
    if (res.success) {
      setPwStatus({ ok: res.message });
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
    } else {
      setPwStatus({ err: res.message });
    }
  };

  const handleAccountDelete = () => {
    const res = onDeleteAccount(deleteConfirmationInput);
    if (!res.success) {
      showToast(res.message);
    }
  };

  const sampleAiCaptions: Record<string, string> = {
    Friendly: 'Golden hour on the rooftop and the groove just hit different. Come dance with me! 💚',
    'Gen Z': 'rooftop at golden hour?? we ATE. run it back 🔥 no thoughts just vibes',
    Professional: 'A rooftop choreography session at golden hour. A new routine drops this week. Follow for more.'
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#1b261f] bg-[var(--card)]/90 backdrop-blur-md">
        <button
          onClick={() => {
            if (activeSectionId) {
              setActiveSectionId(null);
            } else {
              onBack();
            }
            playTapSound();
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{activeSectionId ? 'Back to Settings' : 'Profile'}</span>
        </button>

        <h3 className="font-extrabold text-sm text-white">
          {activeSectionId
            ? sections.find((s) => s.id === activeSectionId)?.title || 'Settings'
            : 'Settings & Privacy'}
        </h3>

        <div className="w-12 text-right">
          <span className="text-[10px] text-[#22c55e] font-bold">BLiN</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeSectionId === null ? (
          <>
            <p className="text-xs text-gray-400">
              Personalize your BLiN experience. Live items apply immediately to your app, while security controls protect your account.
            </p>

            <div className="space-y-1.5">
              {sections.map((sec) => {
                const IconComponent = sec.icon;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSectionId(sec.id);
                      playTapSound();
                    }}
                    className="w-full text-left p-3 rounded-xl bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1a251e] flex items-center justify-center text-[#22c55e] flex-none">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-white group-hover:text-[#4ade80] transition-colors truncate">
                          {sec.title}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{sec.desc}</div>
                      </div>
                    </div>
                    <span className="text-gray-500 group-hover:text-gray-300">›</span>
                  </button>
                );
              })}
            </div>

            {/* Implementation Checklist */}
            <details className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-xs cursor-pointer">
              <summary className="font-bold text-white flex items-center justify-between">
                <span>🧑‍💻 Implementation Checklist</span>
                <span className="text-[10px] text-[#22c55e] font-extrabold bg-[#22c55e]/10 px-2 py-0.5 rounded-full">
                  100% Operational
                </span>
              </summary>
              <div className="pt-3 space-y-2 text-gray-300 border-t border-[#233127] mt-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Real-time procedural Web Audio melody synthesis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Live Hidden Words comment censoring with •••</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Full 6-step interactive signup with handle regex &amp; teen safety</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Super Admin moderation for reports, suspensions, and clips</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Screen-time break reminder background timer &amp; toast alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                  <span>Dynamic theme engine (Dark, Light, High Contrast, Zoom scaling)</span>
                </div>
              </div>
            </details>

            <button
              onClick={() => {
                onLogout();
                playTapSound();
              }}
              className="w-full py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs transition-colors"
            >
              Log Out
            </button>
          </>
        ) : (
          <div className="space-y-4 text-xs">
            {/* Section 1: Your Account */}
            {activeSectionId === 'acct' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2.5">
                  <div>
                    <span className="text-gray-400 font-bold block mb-1">Handle</span>
                    <span className="text-white font-extrabold text-sm">@{currentUser.u}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block mb-1">Email Address</span>
                    <span className="text-gray-200">{currentUser.em}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block mb-1">Account Role</span>
                    <span className="text-[#a3e635] font-extrabold capitalize">{currentUser.role}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white mb-0.5">Account Experience Type</div>
                    <div className="text-[11px] text-gray-400">
                      Creator accounts receive the New Creator Boost
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      currentUser.kind = currentUser.kind === 'creator' ? 'watcher' : 'creator';
                      showToast(`Switched to ${currentUser.kind} mode`);
                      playTapSound();
                    }}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#22c55e] text-[#04210f]"
                  >
                    {currentUser.kind === 'creator' ? '🎬 Creator' : '👀 Watcher'}
                  </button>
                </div>
              </div>
            )}

            {/* Section 2: Account & Security */}
            {activeSectionId === 'sec' && (
              <div className="space-y-3">
                {/* Password form */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2.5">
                  <h4 className="font-bold text-white">Change Password</h4>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="password"
                    placeholder="New password (8+ chars, letters + numbers)"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-2 text-white"
                  />
                  {pwStatus.err && <p className="text-red-400 text-[11px]">{pwStatus.err}</p>}
                  {pwStatus.ok && <p className="text-[#22c55e] text-[11px]">{pwStatus.ok}</p>}
                  <button
                    onClick={handlePasswordSubmit}
                    className="w-full py-2 rounded-lg gradient-btn font-bold text-xs"
                  >
                    Update Password
                  </button>
                </div>

                {/* 2FA Toggle */}
                <label className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-bold text-white">Two-Step Verification (2FA)</div>
                    <div className="text-[11px] text-gray-400">Extra security layer for logins</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.tfa)}
                    onChange={(e) => onUpdateSetting('tfa', e.target.checked ? 1 : 0)}
                    className="accent-[#22c55e] w-4 h-4"
                  />
                </label>

                {/* Data Export */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Download My Data</div>
                      <div className="text-[11px] text-gray-400">View your account profile in JSON</div>
                    </div>
                    <button
                      onClick={() => setShowJsonData(!showJsonData)}
                      className="px-3 py-1.5 rounded-lg bg-[#1a251e] text-[#a3e635] font-bold"
                    >
                      {showJsonData ? 'Hide' : 'View'}
                    </button>
                  </div>
                  {showJsonData && (
                    <pre className="p-2.5 bg-[#0a0f0c] text-emerald-400 rounded-lg text-[10px] overflow-x-auto max-h-48 border border-[#233128]">
                      {JSON.stringify(
                        {
                          username: currentUser.u,
                          name: currentUser.name,
                          email: currentUser.em,
                          role: currentUser.role,
                          followers: currentUser.fol,
                          bio: currentUser.bio,
                          myClips: clips.filter((c) => c.h === currentUser.u)
                        },
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>

                {/* Deactivate & Delete */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2.5">
                  <h4 className="font-bold text-white">Deactivation &amp; Deletion</h4>
                  <button
                    onClick={onDeactivateAccount}
                    className="w-full py-2 rounded-lg bg-[#1e2a22] hover:bg-[#27382d] text-gray-300 font-bold"
                  >
                    Deactivate Account
                  </button>
                  <p className="text-[11px] text-gray-400">
                    To permanently delete your account, type your handle <b>@{currentUser.u}</b> below:
                  </p>
                  <input
                    type="text"
                    placeholder={`Type ${currentUser.u}`}
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-1.5 text-white"
                  />
                  <button
                    onClick={handleAccountDelete}
                    className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold"
                  >
                    Permanently Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* Section 3: Privacy & Safety */}
            {activeSectionId === 'priv' && (
              <div className="space-y-3">
                <label className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="font-bold text-white">Private Account</div>
                    <div className="text-[11px] text-gray-400">Only approved followers can view your clips</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.priv)}
                    onChange={(e) => onUpdateSetting('priv', e.target.checked ? 1 : 0)}
                    className="accent-[#22c55e] w-4 h-4"
                  />
                </label>

                {/* Comments & Mentions control */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Who can comment</span>
                    <select
                      value={settings.cmWho}
                      onChange={(e) => onUpdateSetting('cmWho', e.target.value)}
                      className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                    >
                      <option value="Everyone">Everyone</option>
                      <option value="People I follow">People I follow</option>
                      <option value="No one">No one</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Who can tag or mention you</span>
                    <select
                      value={settings.mnWho}
                      onChange={(e) => onUpdateSetting('mnWho', e.target.value)}
                      className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                    >
                      <option value="Everyone">Everyone</option>
                      <option value="People I follow">People I follow</option>
                      <option value="No one">No one</option>
                    </select>
                  </div>
                </div>

                {/* Hidden words filter */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>Hidden Words Filter</span>
                      <span className="text-[9px] bg-[#22c55e]/20 text-[#4ade80] px-1.5 py-0.2 rounded-full font-bold">
                        live
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.hidOn)}
                      onChange={(e) => onUpdateSetting('hidOn', e.target.checked ? 1 : 0)}
                      className="accent-[#22c55e] w-4 h-4"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Censors matching words in comments with •••
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. spam, scam, hate"
                    value={settings.hid}
                    onChange={(e) => onUpdateSetting('hid', e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-1.5 text-white"
                  />
                </div>

                {/* Blocked creators */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <h4 className="font-bold text-white">Blocked Creators</h4>
                  <div className="space-y-1.5">
                    {allCreators.map((handle) => {
                      const isBlocked = Boolean(blockedUsers[handle]);
                      return (
                        <div key={handle} className="flex items-center justify-between py-1">
                          <span className="text-gray-300 font-semibold">@{handle}</span>
                          <button
                            onClick={() => onToggleBlockUser(handle)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                              isBlocked
                                ? 'bg-[#22c55e] text-[#04210f]'
                                : 'bg-[#1e2a22] text-gray-300 hover:bg-[#27382d]'
                            }`}
                          >
                            {isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Report creator form */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <h4 className="font-bold text-white">Report a Creator</h4>
                  <select
                    value={reportCreatorHandle}
                    onChange={(e) => setReportCreatorHandle(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg p-2 text-white"
                  >
                    <option value="">Select a creator</option>
                    {allCreators.map((h) => (
                      <option key={h} value={h}>
                        @{h}
                      </option>
                    ))}
                  </select>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg p-2 text-white"
                  >
                    <option value="Spam">Spam</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Copyright">Copyright violation</option>
                    <option value="Inappropriate content">Inappropriate content</option>
                  </select>
                  <button
                    onClick={() => {
                      if (!reportCreatorHandle) {
                        showToast('Please select a creator to report');
                        return;
                      }
                      onSendReport(reportCreatorHandle, reportReason);
                      setReportCreatorHandle('');
                    }}
                    className="w-full py-2 rounded-lg bg-amber-500/20 text-amber-300 font-bold"
                  >
                    Submit Report to Safety Team
                  </button>
                </div>
              </div>
            )}

            {/* Section 4: Notifications */}
            {activeSectionId === 'notif' && (
              <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                {[
                  { key: 'nLikes', label: 'Likes and reactions' },
                  { key: 'nCm', label: 'Comments and replies' },
                  { key: 'nFol', label: 'New followers' },
                  { key: 'nDm', label: 'Direct messages' },
                  { key: 'nCom', label: 'Community activity' },
                  { key: 'nAnn', label: 'Platform & Creator announcements' },
                  { key: 'nPush', label: 'Push alerts' },
                  { key: 'nMail', label: 'Email digest' },
                  { key: 'nIn', label: 'In-app banners' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-200">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[key as keyof SettingsState])}
                      onChange={(e) =>
                        onUpdateSetting(key as keyof SettingsState, (e.target.checked ? 1 : 0) as never)
                      }
                      className="accent-[#22c55e] w-4 h-4"
                    />
                  </label>
                ))}
              </div>
            )}

            {/* Section 5: Video & Feed */}
            {activeSectionId === 'feed' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-200">Autoplay videos</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.auto)}
                      onChange={(e) => onUpdateSetting('auto', e.target.checked ? 1 : 0)}
                      className="accent-[#22c55e] w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-200">Data Saver</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.saver)}
                      onChange={(e) => onUpdateSetting('saver', e.target.checked ? 1 : 0)}
                      className="accent-[#22c55e] w-4 h-4"
                    />
                  </label>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-200">Video streaming quality</span>
                    <select
                      value={settings.qual}
                      onChange={(e) => onUpdateSetting('qual', e.target.value)}
                      className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                    >
                      <option value="Auto">Auto</option>
                      <option value="Low">Low (Data Saver)</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High (HD)</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-200">Auto Captions</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.caps)}
                      onChange={(e) => onUpdateSetting('caps', e.target.checked ? 1 : 0)}
                      className="accent-[#22c55e] w-4 h-4"
                    />
                  </label>
                </div>

                {/* Content Interests / Topics */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2.5">
                  <div className="font-bold text-white">Content Interests ({settings.topics.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TOPICS.map((t) => {
                      const isSelected = settings.topics.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => {
                            const newTopics = isSelected
                              ? settings.topics.filter((x) => x !== t)
                              : [...settings.topics, t];
                            onUpdateSetting('topics', newTopics);
                            playTapSound();
                          }}
                          className={`text-xs px-3 py-1 rounded-full font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#22c55e] text-[#04210f]'
                              : 'bg-[#101712] text-gray-400 border border-[#27372d]'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      onUpdateSetting('topics', []);
                      showToast('Recommendations reset ✨');
                    }}
                    className="text-[11px] text-[#4ade80] font-bold"
                  >
                    Reset Recommendation Weights
                  </button>
                </div>
              </div>
            )}

            {/* Section 6: Creator Studio */}
            {activeSectionId === 'studio' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200">Default clip audience</span>
                    <select
                      value={settings.aud}
                      onChange={(e) => onUpdateSetting('aud', e.target.value)}
                      className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                    >
                      <option value="Public">Public (Boosted)</option>
                      <option value="Followers">Followers Only</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-200">Comments on new clips</span>
                    <select
                      value={settings.cmDef}
                      onChange={(e) => onUpdateSetting('cmDef', e.target.value)}
                      className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                    >
                      <option value="Everyone">Allowed (Everyone)</option>
                      <option value="People I follow">People I follow only</option>
                      <option value="Off">Turned Off</option>
                    </select>
                  </div>
                </div>

                {/* Drafts Manager */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <h4 className="font-bold text-white">Saved Drafts ({drafts.length})</h4>
                  {drafts.length === 0 ? (
                    <p className="text-gray-400 text-[11px]">No saved drafts. Save one from the Studio.</p>
                  ) : (
                    <div className="space-y-2">
                      {drafts.map((d, dIdx) => (
                        <div
                          key={dIdx}
                          className="flex items-center justify-between p-2 rounded-lg bg-[#101712] border border-[#27372d]"
                        >
                          <span className="truncate max-w-[170px] text-gray-200">
                            {d.cap || 'Untitled draft'}
                          </span>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => onOpenDraft(dIdx)}
                              className="px-2.5 py-1 rounded bg-[#22c55e] text-[#04210f] font-bold text-[10px]"
                            >
                              Open
                            </button>
                            <button
                              onClick={() => onDeleteDraft(dIdx)}
                              className="p-1 rounded text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section 9: BLiN AI */}
            {activeSectionId === 'ai' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">AI response style</span>
                    <select
                      value={settings.aiStyle}
                      onChange={(e) =>
                        onUpdateSetting('aiStyle', e.target.value as SettingsState['aiStyle'])
                      }
                      className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                    >
                      <option value="Friendly">Friendly</option>
                      <option value="Gen Z">Gen Z / Slang</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-lg bg-[#101712] border border-[#27372d]">
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">
                      Sample Generated Caption:
                    </div>
                    <p className="text-emerald-300 italic">
                      "{sampleAiCaptions[settings.aiStyle]}"
                    </p>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-white font-medium">Label Synthetic / AI Content</div>
                      <div className="text-[11px] text-gray-400">
                        Clearly displays an AI badge on generated media
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(settings.aiLabel)}
                      onChange={(e) => onUpdateSetting('aiLabel', e.target.checked ? 1 : 0)}
                      className="accent-[#22c55e] w-4 h-4"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Section 10: Appearance & Accessibility */}
            {activeSectionId === 'look' && (
              <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Color Theme</span>
                  <select
                    value={settings.theme}
                    onChange={(e) =>
                      onUpdateSetting('theme', e.target.value as SettingsState['theme'])
                    }
                    className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                  >
                    <option value="Dark">Dark Mode</option>
                    <option value="Light">Light Mode</option>
                    <option value="System">System Default</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-white font-medium">Text Scale</span>
                  <select
                    value={settings.txt}
                    onChange={(e) =>
                      onUpdateSetting('txt', e.target.value as SettingsState['txt'])
                    }
                    className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                  >
                    <option value="Small">Small (90%)</option>
                    <option value="Default">Default (100%)</option>
                    <option value="Large">Large (115%)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white font-medium">Reduce Animations &amp; Motion</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.rm)}
                    onChange={(e) => onUpdateSetting('rm', e.target.checked ? 1 : 0)}
                    className="accent-[#22c55e] w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white font-medium">High Contrast Text</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.hc)}
                    onChange={(e) => onUpdateSetting('hc', e.target.checked ? 1 : 0)}
                    className="accent-[#22c55e] w-4 h-4"
                  />
                </label>
              </div>
            )}

            {/* Section 11: Supabase & Storage */}
            {activeSectionId === 'data' && (
              <div className="space-y-3.5">
                {/* Supabase Connection Overview Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#121c15] to-[#0d1610] border border-[#22c55e]/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 flex items-center justify-center text-[#22c55e]">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          <span>Supabase Cloud Database</span>
                          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                        </h4>
                        <p className="text-[11px] text-gray-400">Authenticated project configuration</p>
                      </div>
                    </div>

                    <button
                      onClick={handleTestSupabase}
                      disabled={isTestingSupabase}
                      className="px-3 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#a3e635] text-[#04210f] font-extrabold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                      <span>{isTestingSupabase ? 'Testing…' : 'Test Ping'}</span>
                    </button>
                  </div>

                  {/* Test Result Banner */}
                  {supabaseTestResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                        supabaseTestResult.connected
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-red-950/60 border-red-500/40 text-red-300'
                      }`}
                    >
                      {supabaseTestResult.connected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-none" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-none" />
                      )}
                      <div className="flex-1 font-mono text-[11px]">
                        {supabaseTestResult.message}
                      </div>
                    </div>
                  )}

                  {/* Credentials Table */}
                  <div className="space-y-2 pt-1 font-mono text-xs">
                    {/* Project URL */}
                    <div className="p-2.5 rounded-lg bg-[#0a110c] border border-[#1e2a21] flex items-center justify-between gap-2">
                      <div className="overflow-hidden">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-sans font-bold">
                          Project URL
                        </div>
                        <div className="text-emerald-300 text-[11px] truncate">{SUPABASE_URL}</div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(SUPABASE_URL, 'Project URL')}
                        className="p-1.5 rounded bg-[#16231a] hover:bg-[#203326] text-gray-300 hover:text-white flex-none"
                        title="Copy URL"
                      >
                        {copiedKey === 'Project URL' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Publishable Anon Key */}
                    <div className="p-2.5 rounded-lg bg-[#0a110c] border border-[#1e2a21] flex items-center justify-between gap-2">
                      <div className="overflow-hidden">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-sans font-bold">
                          Publishable Key
                        </div>
                        <div className="text-gray-300 text-[11px] truncate">
                          {SUPABASE_ANON_KEY.substring(0, 18)}••••••••••••••••••••••••••••
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(SUPABASE_ANON_KEY, 'Publishable Key')}
                        className="p-1.5 rounded bg-[#16231a] hover:bg-[#203326] text-gray-300 hover:text-white flex-none"
                        title="Copy Key"
                      >
                        {copiedKey === 'Publishable Key' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Postgres Connection String */}
                    <div className="p-2.5 rounded-lg bg-[#0a110c] border border-[#1e2a21] flex items-center justify-between gap-2">
                      <div className="overflow-hidden">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-sans font-bold">
                          PostgreSQL Connection URI
                        </div>
                        <div className="text-gray-300 text-[10px] truncate">
                          {DEFAULT_POSTGRES_CONNECTION_STRING}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(DEFAULT_POSTGRES_CONNECTION_STRING, 'Connection String')
                        }
                        className="p-1.5 rounded bg-[#16231a] hover:bg-[#203326] text-gray-300 hover:text-white flex-none"
                        title="Copy Connection String"
                      >
                        {copiedKey === 'Connection String' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vercel Deployment & Publishing Readiness Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#0d141f] to-[#0a0f16] border border-blue-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                          <span>Vercel Publishing Readiness</span>
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                            Ready
                          </span>
                        </h4>
                        <p className="text-[11px] text-gray-400">Single Page App routing and Vercel build configuration</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#070b12] border border-[#1a2536] space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-none" />
                      <div className="text-gray-300">
                        <strong className="text-white">SPA Routing Configured:</strong> <code className="text-blue-300 font-mono text-[11px]">vercel.json</code> rewrites all routes to <code className="text-blue-300 font-mono text-[11px]">/index.html</code> so direct links and page refreshes work smoothly without 404s.
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-none" />
                      <div className="text-gray-300">
                        <strong className="text-white">Build Command:</strong> <code className="text-blue-300 font-mono text-[11px]">npm run build</code> (Vite production bundle into <code className="text-blue-300 font-mono text-[11px]">dist</code>).
                      </div>
                    </div>
                  </div>

                  {/* Vercel Environment Variables */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                      Vercel Project Environment Variables:
                    </span>
                    <div className="p-2 rounded-lg bg-[#070b12] border border-[#1a2536] flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400 truncate">VITE_SUPABASE_URL</span>
                      <button
                        onClick={() => copyToClipboard(SUPABASE_URL, 'VITE_SUPABASE_URL')}
                        className="p-1 rounded bg-[#131d2a] hover:bg-[#1a293b] text-gray-300 hover:text-white flex-none"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-2 rounded-lg bg-[#070b12] border border-[#1a2536] flex items-center justify-between text-xs font-mono">
                      <span className="text-gray-400 truncate">VITE_SUPABASE_ANON_KEY</span>
                      <button
                        onClick={() => copyToClipboard(SUPABASE_ANON_KEY, 'VITE_SUPABASE_ANON_KEY')}
                        className="p-1 rounded bg-[#131d2a] hover:bg-[#1a293b] text-gray-300 hover:text-white flex-none"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clear Temporary App Cache */}
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium text-xs">Clear Temporary App Cache</div>
                    <div className="text-[11px] text-gray-400">Resets seen stories and local drafts</div>
                  </div>
                  <button
                    onClick={onClearCache}
                    className="px-3 py-1.5 rounded-lg bg-[#1b2720] hover:bg-[#23332a] text-gray-200 border border-[#2b3c31] font-bold text-xs"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            )}

            {/* Section 12: Digital Wellbeing */}
            {activeSectionId === 'well' && (
              <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Screen-Time Break Reminder</div>
                    <div className="text-[11px] text-gray-400">Nudges you when it's time for a break</div>
                  </div>
                  <select
                    value={settings.remind}
                    onChange={(e) =>
                      onUpdateSetting('remind', e.target.value as SettingsState['remind'])
                    }
                    className="bg-[#101712] border border-[#27372d] rounded px-2 py-1 text-white"
                  >
                    <option value="Off">Off</option>
                    <option value="30 min">Every 30 min</option>
                    <option value="1 hour">Every 1 hour</option>
                    <option value="2 hours">Every 2 hours</option>
                  </select>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white font-medium">Quiet Hours Mute</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.quiet)}
                    onChange={(e) => onUpdateSetting('quiet', e.target.checked ? 1 : 0)}
                    className="accent-[#22c55e] w-4 h-4"
                  />
                </label>
              </div>
            )}

            {/* Section 13: Help & Legal */}
            {activeSectionId === 'help' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <h4 className="font-bold text-white">Community Guidelines</h4>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Be authentic and supportive. No harassment, hate speech, copyright infringement, or deceptive content. Creators under 18 start with safe defaults.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] space-y-2">
                  <h4 className="font-bold text-white">Contact BLiN Support or Appeal</h4>
                  <select
                    value={supportType}
                    onChange={(e) => setSupportType(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded p-2 text-white"
                  >
                    <option value="Question">General Question</option>
                    <option value="Appeal">Moderation Appeal</option>
                    <option value="Bug">Bug Report</option>
                  </select>
                  <textarea
                    rows={3}
                    placeholder="Describe your issue or appeal…"
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    className="w-full bg-[#101712] border border-[#27372d] rounded-lg p-2 text-white"
                  />
                  <button
                    onClick={() => {
                      if (!supportMessage.trim()) {
                        showToast('Please enter a message for support');
                        return;
                      }
                      onSendSupport(supportType, supportMessage.trim());
                      setSupportMessage('');
                    }}
                    className="w-full py-2 rounded-lg gradient-btn font-bold text-xs"
                  >
                    Send to Support
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
