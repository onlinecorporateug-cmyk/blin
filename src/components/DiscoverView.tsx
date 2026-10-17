import React, { useState } from 'react';
import { Search, Flame, Sparkles } from 'lucide-react';
import { Clip } from '../types';
import { IM } from '../data/mockData';

interface DiscoverViewProps {
  clips: Clip[];
  currentHandle: string;
  following: Record<string, boolean>;
  blockedUsers: Record<string, boolean>;
  onToggleFollow: (handle: string) => void;
  onSelectClip: (clipIndex: number) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  clips,
  currentHandle,
  following,
  blockedUsers,
  onToggleFollow,
  onSelectClip
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Extract all unique tags
  const allTags = Array.from(
    new Set(clips.flatMap((c) => c.tags.split(' ').map((t) => t.trim())).filter(Boolean))
  );

  const queryLower = searchQuery.toLowerCase().trim();

  // Filter creators
  const creators = clips.filter(
    (c) =>
      c.h !== currentHandle &&
      !blockedUsers[c.h] &&
      (!queryLower || (c.n + ' ' + c.h).toLowerCase().includes(queryLower))
  );

  // Filter clips
  const matchedClips = clips
    .map((c, idx) => ({ clip: c, index: idx }))
    .filter(({ clip }) => {
      if (blockedUsers[clip.h]) return false;
      if (selectedTag && !clip.tags.includes(selectedTag)) return false;
      if (queryLower) {
        const text = (clip.t + ' ' + clip.n + ' ' + clip.h + ' ' + clip.tags).toLowerCase();
        return text.includes(queryLower);
      }
      return true;
    });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-1.5">
          <span>Discover</span>
          <Sparkles className="w-4 h-4 text-[#a3e635]" />
        </h2>
        <span className="text-xs font-semibold text-gray-400">Trending in Kampala</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search creators, vibes, tags…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#22c55e]"
        />
      </div>

      {/* Tags Chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {allTags.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(isSelected ? '' : tag)}
              className={`flex-none text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                isSelected
                  ? 'bg-[#22c55e] text-[#04210f] shadow-md font-bold'
                  : 'bg-[var(--card)] text-gray-300 hover:bg-[#1d2720] border border-[var(--border)]'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Rising Creators Section */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>Rising Creators</span>
        </h3>

        <div className="space-y-2">
          {creators.length === 0 ? (
            <p className="text-xs text-gray-400 py-3 text-center">No creators found.</p>
          ) : (
            creators.map((c) => {
              const isFollowed = Boolean(following[c.h]);
              return (
                <div
                  key={c.h}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-cover bg-center border border-[#2b3a2f] flex-none"
                      style={{ backgroundImage: `url(${c.i.startsWith('data:') ? c.i : (IM[c.i] || IM.a)})` }}
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white truncate">{c.n}</div>
                      <div className="text-[11px] text-gray-400 truncate">
                        @{c.h} · {c.v} views
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleFollow(c.h)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                      isFollowed
                        ? 'bg-[#22c55e]/20 text-[#a3e635] border border-[#22c55e]/50'
                        : 'bg-[#22c55e] text-[#04210f] hover:bg-[#a3e635]'
                    }`}
                  >
                    {isFollowed ? 'Following' : 'Follow'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Visual Clip Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
          Vibes Grid ({matchedClips.length})
        </h3>

        {matchedClips.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            No clips match your current filter 👀
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
            {matchedClips.map(({ clip, index }) => (
              <button
                key={clip.id || index}
                onClick={() => onSelectClip(index)}
                className="relative aspect-3/4 bg-cover bg-center rounded-lg overflow-hidden transition-transform hover:scale-95 group focus:outline-none"
                style={{
                  backgroundImage: `url(${clip.i.startsWith('data:') ? clip.i : (IM[clip.i] || IM.a)})`,
                  filter: clip.fl || 'none'
                }}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                <div className="absolute bottom-1.5 left-1.5 right-1.5 text-left">
                  <span className="text-[10px] font-bold text-white drop-shadow truncate block">
                    @{clip.h}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
