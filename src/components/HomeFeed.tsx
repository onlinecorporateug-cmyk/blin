import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Bookmark, Share2, Plus, X, Music, UserCheck, UserPlus, Send, Trash2 } from 'lucide-react';
import { Clip, Story, Account } from '../types';
import { IM } from '../data/mockData';
import { playLikeSound, playTapSound } from '../utils/audio';

interface HomeFeedProps {
  clips: Clip[];
  stories: Story[];
  currentUser: Account;
  following: Record<string, boolean>;
  blockedUsers: Record<string, boolean>;
  hiddenWords: string;
  isFilterWordsActive: boolean;
  onToggleLike: (clipIndex: number) => void;
  onToggleSave: (clipIndex: number) => void;
  onToggleFollow: (handle: string) => void;
  onAddComment: (clipIndex: number, comment: string) => void;
  onDeleteComment?: (clipIndex: number, commentIndex: number) => void;
  onDeleteClip?: (clipIndex: number) => void;
  onOpenCreateStory: () => void;
  onOpenStoryViewer: (index: number) => void;
  activeStoryIndex: number | null;
  onCloseStoryViewer: () => void;
  onNextStory: () => void;
  showToast: (message: string) => void;
}

export const HomeFeed: React.FC<HomeFeedProps> = ({
  clips,
  stories,
  currentUser,
  following,
  blockedUsers,
  hiddenWords,
  isFilterWordsActive,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onAddComment,
  onDeleteComment,
  onDeleteClip,
  onOpenCreateStory,
  onOpenStoryViewer,
  activeStoryIndex,
  onCloseStoryViewer,
  onNextStory,
  showToast
}) => {
  const [activeCommentClipIndex, setActiveCommentClipIndex] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Format large numbers (e.g. 14200 -> 14.2K)
  const formatCount = (n: number) => {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : n.toString();
  };

  // Filter hidden words
  const filterText = (text: string) => {
    if (!isFilterWordsActive || !hiddenWords) return text;
    let filtered = text;
    const words = hiddenWords.split(',').map((w) => w.trim()).filter(Boolean);
    words.forEach((w) => {
      const regex = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      filtered = filtered.replace(regex, '•••');
    });
    return filtered;
  };

  // Handle posting a comment
  const handlePostComment = () => {
    if (activeCommentClipIndex === null) return;
    const trimmed = commentInput.trim();
    if (!trimmed) return;
    onAddComment(activeCommentClipIndex, trimmed);
    setCommentInput('');
    playTapSound();
    setTimeout(() => {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Auto advance story
  useEffect(() => {
    if (activeStoryIndex === null) return;
    const timer = setTimeout(() => {
      onNextStory();
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeStoryIndex, onNextStory]);

  const activeStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Stories Carousel */}
      <div className="relative z-10 flex gap-3 px-3 py-2.5 overflow-x-auto no-scrollbar bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {stories.map((story, idx) => {
          const isYou = Boolean(story.you);
          const storyVisual = story.i.startsWith('data:') ? story.i : (IM[story.i] || IM.a);

          return (
            <button
              key={idx}
              onClick={() => {
                if (isYou) {
                  onOpenCreateStory();
                } else {
                  onOpenStoryViewer(idx);
                }
              }}
              className="flex flex-col items-center gap-1 flex-none group focus:outline-none"
            >
              <div
                className={`p-[2px] rounded-full transition-transform group-hover:scale-105 ${
                  isYou
                    ? 'border-2 border-dashed border-[#22c55e]'
                    : story.seen
                    ? 'bg-gray-600'
                    : 'bg-gradient-to-tr from-[#4ade80] via-[#a3e635] to-amber-400 shadow-md'
                }`}
              >
                <div
                  className="w-13 h-13 rounded-full bg-cover bg-center border-2 border-[var(--bg)] relative overflow-hidden"
                  style={{
                    backgroundImage: `url(${storyVisual})`,
                    filter: story.fl || 'none'
                  }}
                >
                  {isYou && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-[#22c55e] flex items-center justify-center text-black">
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-gray-200 tracking-tight truncate max-w-[62px]">
                {isYou ? 'Your story' : story.n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Snap Feed */}
      <main className="flex-1 clip-feed no-scrollbar">
        {clips.map((clip, index) => {
          if (blockedUsers[clip.h]) return null;

          const isLiked = Boolean(clip.liked);
          const isSaved = Boolean(clip.saved);
          const isFollowed = Boolean(following[clip.h]);
          const isOwnClip = clip.h === currentUser.u;
          const totalLikes = clip.l + (isLiked ? 1 : 0);
          const totalComments = clip.c + clip.cm.filter((c) => c[2]).length;
          const clipVisual = clip.i.startsWith('data:') ? clip.i : (IM[clip.i] || IM.a);

          return (
            <section key={clip.id || index} className="clip-item relative flex flex-col justify-end">
              {/* Background cover / video simulation */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                style={{
                  backgroundImage: `url(${clipVisual})`,
                  filter: clip.fl || 'none'
                }}
              />

              {/* Gradient scrim overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />

              {/* Delete own clip button */}
              {isOwnClip && onDeleteClip && (
                <div className="absolute top-16 right-3 z-20">
                  <button
                    onClick={() => {
                      if (confirm('Delete this clip from BLiN?')) {
                        onDeleteClip(index);
                      }
                    }}
                    title="Delete your clip"
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-red-400 border border-white/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sticker overlay if present */}
              {clip.sk && (
                <div className="absolute bottom-56 left-0 right-0 text-center pointer-events-none z-10">
                  <span className="inline-block bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-base font-extrabold text-[#a3e635] shadow-lg border border-[#a3e635]/30">
                    {clip.sk}
                  </span>
                </div>
              )}

              {/* Right Action Rail */}
              <div className="absolute right-3 bottom-8 z-20 flex flex-col items-center gap-4">
                {/* Like Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      onToggleLike(index);
                      if (!isLiked) playLikeSound();
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-80 shadow-lg ${
                      isLiked
                        ? 'bg-[#22c55e]/70 text-white'
                        : 'bg-black/50 hover:bg-black/70 text-white'
                    }`}
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${
                        isLiked ? 'fill-red-500 stroke-red-500 scale-110' : 'stroke-white'
                      }`}
                    />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
                    {formatCount(totalLikes)}
                  </span>
                </div>

                {/* Comment Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      setActiveCommentClipIndex(index);
                      playTapSound();
                    }}
                    className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center backdrop-blur-md text-white shadow-lg transition-transform active:scale-90"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
                    {formatCount(totalComments)}
                  </span>
                </div>

                {/* Save Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      onToggleSave(index);
                      playTapSound();
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 shadow-lg ${
                      isSaved ? 'bg-amber-400 text-black' : 'bg-black/50 hover:bg-black/70 text-white'
                    }`}
                  >
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-black' : ''}`} />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">
                    {isSaved ? 'Saved' : 'Save'}
                  </span>
                </div>

                {/* Share Button */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      showToast('Link copied to clipboard 🚀');
                      playTapSound();
                    }}
                    className="w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center backdrop-blur-md text-white shadow-lg transition-transform active:scale-90"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <span className="text-[11px] font-bold text-white mt-1 drop-shadow-md">Share</span>
                </div>
              </div>

              {/* Bottom Creator Info & Caption */}
              <div className="relative z-20 px-4 pb-6 pt-16 pr-18 text-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-extrabold text-base tracking-tight drop-shadow">
                    @{clip.h}
                  </span>

                  {!isOwnClip && (
                    <button
                      onClick={() => onToggleFollow(clip.h)}
                      className={`ml-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                        isFollowed
                          ? 'bg-[#22c55e] text-[#04210f] border-[#22c55e]'
                          : 'bg-black/40 text-white border-white/70 hover:bg-white/20'
                      }`}
                    >
                      {isFollowed ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3" />
                          Follow
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="text-sm font-medium line-clamp-2 leading-relaxed drop-shadow-sm mb-1.5">
                  {clip.t}
                </p>

                <div className="text-xs text-[#a3e635] font-semibold mb-2 drop-shadow">
                  {clip.tags}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-300 font-medium">
                  <Music className="w-3.5 h-3.5 text-[#22c55e] animate-spin-slow" />
                  <span className="truncate max-w-[210px]">{clip.s}</span>
                  <span className="text-gray-400">· {clip.v} views</span>
                </div>
              </div>
            </section>
          );
        })}
      </main>

      {/* Story Viewer Modal */}
      {activeStory && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col justify-between"
          onClick={onNextStory}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${activeStory.i.startsWith('data:') ? activeStory.i : (IM[activeStory.i] || IM.a)})`,
              filter: activeStory.fl || 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none" />

          {/* Top Progress bar and Header */}
          <div className="relative z-10 p-3 pt-4">
            <div className="h-1 bg-white/30 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-white animate-story-progress rounded-full" />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full bg-cover bg-center border border-white"
                  style={{
                    backgroundImage: `url(${activeStory.i.startsWith('data:') ? activeStory.i : (IM[activeStory.i] || IM.a)})`
                  }}
                />
                <span className="font-extrabold text-white text-sm drop-shadow">
                  @{activeStory.n}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseStoryViewer();
                }}
                className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white text-lg font-bold hover:bg-black/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Story Text / Sticker in middle/bottom */}
          <div className="relative z-10 p-6 text-center">
            <h2 className="text-2xl font-black text-white drop-shadow-lg tracking-tight">
              {activeStory.x || '✨ Vibing on BLiN'}
            </h2>
          </div>
        </div>
      )}

      {/* Comment Bottom Sheet */}
      {activeCommentClipIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveCommentClipIndex(null)}
          />

          <div className="relative z-10 bg-[#0f1712] border-t border-[#233128] rounded-t-2xl max-h-[70%] flex flex-col shadow-2xl">
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f2b23]">
              <span className="text-sm font-bold text-gray-200">
                Comments ({clips[activeCommentClipIndex].cm.length})
              </span>
              <button
                onClick={() => setActiveCommentClipIndex(null)}
                className="w-7 h-7 rounded-full bg-[#1b261f] flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[120px]">
              {clips[activeCommentClipIndex].cm.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-6">
                  Be the first to share your thoughts on this clip ✨
                </p>
              ) : (
                clips[activeCommentClipIndex].cm.map((comment, cIdx) => {
                  const isMyComment = comment[0] === currentUser.u;
                  return (
                    <div key={cIdx} className="flex items-center justify-between text-xs leading-relaxed group">
                      <div>
                        <span className="font-extrabold text-[#4ade80] mr-2">
                          @{comment[0]}
                        </span>
                        <span className="text-gray-200">{filterText(comment[1])}</span>
                      </div>

                      {isMyComment && onDeleteComment && (
                        <button
                          onClick={() => onDeleteComment(activeCommentClipIndex, cIdx)}
                          title="Delete comment"
                          className="p-1 text-gray-500 hover:text-red-400 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Input Bar or Disabled Notice */}
            {clips[activeCommentClipIndex].nocm ? (
              <div className="p-3 text-center text-xs text-gray-400 bg-[#16201a] border-t border-[#1f2b23]">
                Comments are turned off for this clip.
              </div>
            ) : (
              <div className="p-3 border-t border-[#1f2b23] flex items-center gap-2 bg-[#121a15]">
                <input
                  type="text"
                  placeholder="Add a comment…"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePostComment();
                  }}
                  className="flex-1 bg-[#1a2620] border border-[#2a3b30] rounded-full px-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#22c55e]"
                />
                <button
                  onClick={handlePostComment}
                  disabled={!commentInput.trim()}
                  className="p-2 rounded-full bg-[#22c55e] text-[#04210f] disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
