import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, Edit3, Check, Crown, Shield, Award, Sparkles, LogOut, Camera, Trash2 } from 'lucide-react';
import { Account, Clip } from '../types';
import { IM } from '../data/mockData';
import { playTapSound } from '../utils/audio';

interface ProfileViewProps {
  currentUser: Account;
  clips: Clip[];
  following: Record<string, boolean>;
  onUpdateProfile: (name: string, bio: string, avatar?: string) => void;
  onOpenSettings: () => void;
  onSelectClip: (clipIndex: number) => void;
  onDeleteMyClip?: (clipId: string) => void;
  onLogout: () => void;
  totalMembersCount: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  clips,
  following,
  onUpdateProfile,
  onOpenSettings,
  onSelectClip,
  onDeleteMyClip,
  onLogout,
  totalMembersCount
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio || '');
  const [activeTab, setActiveTab] = useState<'posted' | 'liked' | 'saved'>('posted');

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const myClips = clips.filter((c) => c.h === currentUser.u);
  const totalLikesReceived = myClips.reduce((sum, c) => sum + c.l + (c.liked ? 1 : 0), 0);
  const followingCount = Object.values(following).filter(Boolean).length;

  const creatorScore = totalLikesReceived * 10 + currentUser.fol * 100;

  const likedClips = clips.filter((c) => c.liked);
  const savedClips = clips.filter((c) => c.saved);

  const displayedClips = {
    posted: myClips,
    liked: likedClips,
    saved: savedClips
  }[activeTab];

  const handleSaveEdit = () => {
    onUpdateProfile(editName.trim() || currentUser.name, editBio.trim(), currentUser.avatar);
    setIsEditing(false);
    playTapSound();
  };

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateProfile(currentUser.name, currentUser.bio || '', reader.result);
        playTapSound();
      }
    };
    reader.readAsDataURL(file);
  };

  const formatCount = (n: number) => {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      {/* Hidden avatar input */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarFile}
        accept="image/*"
        className="hidden"
      />

      {/* Profile Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3.5">
          {/* Avatar with photo upload badge */}
          <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#22c55e] to-[#a3e635] p-0.5 shadow-lg flex-none overflow-hidden">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#151c17] flex items-center justify-center font-extrabold text-xl text-white">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#22c55e] text-[#04210f] flex items-center justify-center shadow-md border-2 border-[var(--bg)]">
              <Camera className="w-3 h-3 stroke-[2.5]" />
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-white truncate flex items-center gap-1.5">
              <span>{currentUser.name}</span>
              {currentUser.role === 'admin' && (
                <span title="Admin">
                  <Shield className="w-4 h-4 text-[#4ade80]" />
                </span>
              )}
              {currentUser.role === 'creator' && (
                <span title="Creator">
                  <Crown className="w-4 h-4 text-amber-400" />
                </span>
              )}
            </h2>

            <p className="text-xs text-gray-400 font-semibold truncate">@{currentUser.u}</p>

            <div className="flex flex-wrap gap-1 mt-1.5">
              {currentUser.role === 'admin' && (
                <span className="text-[10px] font-extrabold bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 px-2 py-0.5 rounded-full">
                  🛡️ Admin
                </span>
              )}
              {currentUser.role === 'creator' && (
                <span className="text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  👑 Creator
                </span>
              )}
              {currentUser.kind === 'creator' && currentUser.role === 'user' && (
                <span className="text-[10px] font-extrabold bg-[#22c55e]/20 text-[#4ade80] px-2 py-0.5 rounded-full">
                  🎬 Creator account
                </span>
              )}
              {currentUser.kind === 'watcher' && currentUser.role === 'user' && (
                <span className="text-[10px] font-extrabold bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded-full">
                  👀 Watcher
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-none">
          {isEditing ? (
            <button
              onClick={handleSaveEdit}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#22c55e] text-[#04210f] flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Done</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditName(currentUser.name);
                setEditBio(currentUser.bio || '');
                setIsEditing(true);
                playTapSound();
              }}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-gray-300 flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenSettings();
              playTapSound();
            }}
            className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] flex items-center justify-center text-gray-300 transition-colors"
            title="Settings & Privacy"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bio & Inline Edit */}
      {isEditing ? (
        <div className="space-y-2 p-3 bg-[var(--card)] rounded-xl border border-[var(--border)]">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#22c55e]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Bio
            </label>
            <input
              type="text"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Tell everyone what you vibe with…"
              className="w-full bg-[#101712] border border-[#27372d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#22c55e]"
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-300 leading-relaxed">
          {currentUser.bio || 'Create your vibe. Find your people.'}
        </p>
      )}

      {/* Vibe Tags */}
      {Boolean(currentUser.vibes && currentUser.vibes.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {currentUser.vibes!.map((vibe) => (
            <span
              key={vibe}
              className="text-[11px] font-semibold bg-[var(--card)] text-[#a3e635] border border-[#22c55e]/20 px-2.5 py-0.5 rounded-full"
            >
              {vibe}
            </span>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <div>
          <div className="font-extrabold text-sm text-white">{myClips.length}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">Clips</div>
        </div>
        <div>
          <div className="font-extrabold text-sm text-white">{formatCount(currentUser.fol)}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">Followers</div>
        </div>
        <div>
          <div className="font-extrabold text-sm text-white">{followingCount}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">Following</div>
        </div>
        <div>
          <div className="font-extrabold text-sm text-white">{formatCount(totalLikesReceived)}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">Likes</div>
        </div>
      </div>

      {/* Creator Score Card */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#17261c] to-[#121c16] border border-[#273a2d] flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xs text-white flex items-center gap-1.5 mb-1">
            <Award className="w-4 h-4 text-[#a3e635]" />
            <span>Creator Score</span>
          </h3>
          <p className="text-[11px] text-gray-300">
            <strong className="text-[#4ade80]">{creatorScore.toLocaleString()}</strong> pts · (Like = 10, Follower = 100)
          </p>
        </div>
        <Sparkles className="w-5 h-5 text-[#22c55e] animate-pulse" />
      </div>

      {/* Clips Sub-Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'posted', label: `🎬 Posted (${myClips.length})` },
          { id: 'liked', label: `❤️ Liked (${likedClips.length})` },
          { id: 'saved', label: `⭐ Saved (${savedClips.length})` }
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'posted' | 'liked' | 'saved');
                playTapSound();
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isSelected
                  ? 'bg-[#22c55e] text-[#04210f] shadow-md'
                  : 'bg-[var(--card)] text-gray-400 hover:text-white border border-[var(--border)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Clips Grid */}
      {displayedClips.length === 0 ? (
        <div className="text-center py-10 text-xs text-gray-400">
          {activeTab === 'posted'
            ? 'No clips posted yet. Go create your first vibe in the Studio ✨'
            : activeTab === 'liked'
            ? 'No liked clips yet. Go explore the Home feed!'
            : 'No saved clips yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
          {displayedClips.map((clip, idx) => (
            <div key={clip.id || idx} className="relative aspect-3/4 rounded-lg overflow-hidden group">
              <button
                onClick={() => onSelectClip(clips.indexOf(clip))}
                className="w-full h-full bg-cover bg-center transition-transform hover:scale-95 focus:outline-none"
                style={{
                  backgroundImage: `url(${clip.i.startsWith('data:') ? clip.i : (IM[clip.i] || IM.a)})`,
                  filter: clip.fl || 'none'
                }}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 text-left">
                  <span className="text-[10px] font-bold text-white drop-shadow truncate block">
                    {clip.t}
                  </span>
                </div>
              </button>

              {/* If viewing own posted clips, allow deleting */}
              {activeTab === 'posted' && onDeleteMyClip && clip.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this clip from BLiN?')) {
                      onDeleteMyClip(clip.id!);
                    }
                  }}
                  title="Delete clip"
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-red-400 hover:bg-black hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Creator Hub / Admin Overview */}
      {(currentUser.role === 'creator' || currentUser.role === 'admin') && (
        <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <h4 className="font-bold text-xs text-white mb-1 flex items-center gap-1.5">
            {currentUser.role === 'admin' ? (
              <>
                <Shield className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>Admin Overview</span>
              </>
            ) : (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Creator Hub</span>
              </>
            )}
          </h4>
          <p className="text-[11px] text-gray-300 leading-relaxed">
            {totalMembersCount} members · {clips.length} clips ·{' '}
            {clips.reduce((sum, c) => sum + c.l, 0).toLocaleString()} likes on BLiN
          </p>
        </div>
      )}

      {/* Logout Button */}
      <button
        onClick={() => {
          onLogout();
          playTapSound();
        }}
        className="w-full py-2.5 rounded-xl bg-[var(--card)] hover:bg-red-500/10 border border-[var(--border)] text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Log Out</span>
      </button>
    </div>
  );
};
