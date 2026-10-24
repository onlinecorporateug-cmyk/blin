import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Settings, Check, CheckCheck, MessageSquarePlus, X } from 'lucide-react';
import { ChatThread } from '../types';
import { IM } from '../data/mockData';
import { playTapSound } from '../utils/audio';

interface MessagesViewProps {
  threads: ChatThread[];
  onSendMessage: (threadIndex: number, text: string) => void;
  onAcceptRequest: (threadIndex: number) => void;
  onDeclineRequest: (threadIndex: number) => void;
  onToggleReaction: (threadIndex: number, messageIndex: number) => void;
  onClearUnread: (threadIndex: number) => void;
  onStartNewChat: (name: string, imageKey: string) => void;
  messagePrivacy: string;
  onUpdateMessagePrivacy: (privacy: string) => void;
  readReceipts: boolean;
  onUpdateReadReceipts: (enabled: boolean) => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  threads,
  onSendMessage,
  onAcceptRequest,
  onDeclineRequest,
  onToggleReaction,
  onClearUnread,
  onStartNewChat,
  messagePrivacy,
  onUpdateMessagePrivacy,
  readReceipts,
  onUpdateReadReceipts
}) => {
  const [activeTab, setActiveTab] = useState<'chats' | 'req'>('chats');
  const [activeThreadIndex, setActiveThreadIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showNewChatModal, setShowNewChatModal] = useState<boolean>(false);
  const [newChatName, setNewChatName] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of active chat
  useEffect(() => {
    if (activeThreadIndex !== null) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThreadIndex, threads]);

  const handleSend = () => {
    if (activeThreadIndex === null) return;
    const trimmed = textInput.trim();
    if (!trimmed) return;
    onSendMessage(activeThreadIndex, trimmed);
    setTextInput('');
    playTapSound();
  };

  const handleStartChatWith = (name: string, imgKey: string) => {
    onStartNewChat(name, imgKey);
    setShowNewChatModal(false);
    setNewChatName('');
    setActiveTab('chats');
    setActiveThreadIndex(0); // newly prepended thread
    playTapSound();
  };

  // If in active chat
  if (activeThreadIndex !== null) {
    const thread = threads[activeThreadIndex];
    if (!thread) {
      setActiveThreadIndex(null);
      return null;
    }

    const avatarSrc = thread.i.startsWith('data:') ? thread.i : (IM[thread.i] || IM.a);

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">
        {/* Chat Header */}
        <div className="px-4 py-2.5 flex items-center gap-3 border-b border-[#1b261f] bg-[var(--card)]/90 backdrop-blur-md">
          <button
            onClick={() => {
              setActiveThreadIndex(null);
              playTapSound();
            }}
            className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] flex items-center justify-center text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div
            className="w-9 h-9 rounded-full bg-cover bg-center border border-[#2b3b30]"
            style={{ backgroundImage: `url(${avatarSrc})` }}
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-sm text-white truncate">{thread.n}</h3>
            <p className="text-[11px] text-[#4ade80] flex items-center gap-1">
              {thread.typing ? (
                <span className="animate-pulse font-semibold">typing…</span>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                  <span>online</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {thread.m.map((msg, mIdx) => {
            const isMe = Boolean(msg.me);
            return (
              <div
                key={mIdx}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  onClick={() => onToggleReaction(activeThreadIndex, mIdx)}
                  className={`relative max-w-[78%] px-3.5 py-2 text-xs leading-relaxed cursor-pointer select-none rounded-2xl shadow-sm transition-transform active:scale-95 ${
                    isMe
                      ? 'bg-[#166534] text-white rounded-br-xs'
                      : 'bg-[var(--card)] text-gray-200 border border-[var(--border)] rounded-bl-xs'
                  }`}
                >
                  <div>{msg.t}</div>

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                    <span>{msg.tm}</span>
                    {isMe && (
                      <span className="inline-flex items-center">
                        {msg.st === 'sent' && <Check className="w-3 h-3 text-gray-300" />}
                        {msg.st === 'del' && <CheckCheck className="w-3.5 h-3.5 text-gray-300" />}
                        {msg.st === 'seen' && (
                          <CheckCheck
                            className={`w-3.5 h-3.5 ${
                              readReceipts ? 'text-sky-400 drop-shadow-[0_0_4px_rgba(56,189,248,0.6)]' : 'text-gray-300'
                            }`}
                          />
                        )}
                      </span>
                    )}
                  </div>

                  {msg.r && (
                    <span className="absolute -bottom-2 right-2 bg-black text-xs px-1.5 py-0.5 rounded-full shadow border border-red-500/30">
                      {msg.r}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* Bottom Bar: Action if Request vs Input if Regular */}
        {thread.req ? (
          <div className="p-3 border-t border-[#1b261f] bg-[var(--card)] flex gap-2">
            <button
              onClick={() => {
                onAcceptRequest(activeThreadIndex);
                setActiveTab('chats');
                setActiveThreadIndex(null);
                playTapSound();
              }}
              className="flex-1 py-2.5 rounded-full bg-[#22c55e] text-[#04210f] font-bold text-xs shadow-md"
            >
              Accept Request
            </button>
            <button
              onClick={() => {
                onDeclineRequest(activeThreadIndex);
                setActiveThreadIndex(null);
                playTapSound();
              }}
              className="flex-1 py-2.5 rounded-full bg-[#1e2a22] hover:bg-[#28382d] text-gray-300 font-bold text-xs border border-[var(--border)]"
            >
              Decline
            </button>
          </div>
        ) : (
          <div className="p-3 border-t border-[#1b261f] bg-[var(--card)] flex items-center gap-2">
            <input
              type="text"
              placeholder="Message…"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              className="flex-1 bg-[#101712] border border-[#27372d] rounded-full px-4 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#22c55e]"
            />
            <button
              onClick={handleSend}
              disabled={!textInput.trim()}
              className="p-2.5 rounded-full bg-[#22c55e] text-[#04210f] disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter threads by tab
  const filteredThreads = threads
    .map((thread, idx) => ({ thread, idx }))
    .filter(({ thread }) => (activeTab === 'req' ? Boolean(thread.req) : !thread.req));

  const totalRequests = threads.filter((t) => t.req).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Messages Header Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#1b261f] bg-[var(--card)]/90 backdrop-blur-md">
        <h2 className="text-base font-extrabold text-white">Messages</h2>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setActiveTab('chats');
              playTapSound();
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'chats'
                ? 'bg-[#22c55e] text-[#04210f]'
                : 'bg-[var(--card)] text-gray-400 hover:text-white'
            }`}
          >
            Chats
          </button>

          <button
            onClick={() => {
              setActiveTab('req');
              playTapSound();
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'req'
                ? 'bg-[#22c55e] text-[#04210f]'
                : 'bg-[var(--card)] text-gray-400 hover:text-white'
            }`}
          >
            <span>Requests</span>
            {totalRequests > 0 && (
              <span className="bg-[#a3e635] text-[#04210f] px-1.5 py-0.2 rounded-full text-[10px]">
                {totalRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setShowNewChatModal(true);
              playTapSound();
            }}
            title="Start New Chat"
            className="p-1.5 rounded-full text-gray-400 hover:text-[#4ade80]"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-full transition-colors ${
              showSettings ? 'text-[#22c55e] bg-[#22c55e]/10' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Dropdown Drawer */}
      {showSettings && (
        <div className="p-3.5 bg-[#121a15] border-b border-[#233328] space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium">Who can message you</span>
            <select
              value={messagePrivacy}
              onChange={(e) => onUpdateMessagePrivacy(e.target.value)}
              className="bg-[#1b261f] border border-[#27372d] text-white text-xs rounded-lg px-2 py-1 outline-none"
            >
              <option value="Everyone">Everyone</option>
              <option value="People I follow">People I follow</option>
              <option value="No one">No one</option>
            </select>
          </div>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-gray-300 font-medium">Read receipts (blue ticks)</span>
            <input
              type="checkbox"
              checked={readReceipts}
              onChange={(e) => onUpdateReadReceipts(e.target.checked)}
              className="accent-[#22c55e] w-4 h-4 rounded"
            />
          </label>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#121c16] border border-[#233128] rounded-2xl p-4 shadow-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Start New Message</h3>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-gray-400 font-medium block">
                Type creator name or handle:
              </label>
              <input
                type="text"
                placeholder="e.g. Amara Nakato"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                className="w-full bg-[#101712] border border-[#27372d] rounded-lg p-2 text-white"
                autoFocus
              />
            </div>

            {newChatName.trim() ? (
              <button
                onClick={() => handleStartChatWith(newChatName.trim(), 'a')}
                className="w-full py-2.5 rounded-xl gradient-btn font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Start conversation with {newChatName.trim()}</span>
              </button>
            ) : (
              <p className="text-[11px] text-gray-400 text-center py-2">
                Type any creator name or handle above to begin messaging.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Threads List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {filteredThreads.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400 space-y-3">
            <p>
              {activeTab === 'req'
                ? 'No pending message requests 🎉'
                : 'No chats yet.'}
            </p>
            {activeTab === 'chats' && (
              <button
                onClick={() => setShowNewChatModal(true)}
                className="px-4 py-2 rounded-full gradient-btn font-bold text-xs inline-flex items-center gap-1.5"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>Start a Conversation</span>
              </button>
            )}
          </div>
        ) : (
          filteredThreads.map(({ thread, idx }) => {
            const lastMsg = thread.m[thread.m.length - 1];
            const avatarSrc = thread.i.startsWith('data:') ? thread.i : (IM[thread.i] || IM.a);

            return (
              <button
                key={idx}
                onClick={() => {
                  setActiveThreadIndex(idx);
                  onClearUnread(idx);
                  playTapSound();
                }}
                className="w-full text-left p-3 rounded-xl bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] flex items-center gap-3 transition-colors group"
              >
                <div
                  className="w-12 h-12 rounded-full bg-cover bg-center border border-[#2b3a2f] flex-none"
                  style={{ backgroundImage: `url(${avatarSrc})` }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-extrabold text-xs text-white truncate">
                      {thread.n}
                    </span>
                    <span className="text-[10px] text-gray-400">{lastMsg?.tm || ''}</span>
                  </div>

                  <p className="text-xs text-gray-400 truncate">
                    {lastMsg ? lastMsg.t : 'Tap to chat'}
                  </p>
                </div>

                {Boolean(thread.u && thread.u > 0) && (
                  <span className="w-5 h-5 rounded-full bg-[#a3e635] text-[#04210f] text-[10px] font-black flex items-center justify-center flex-none shadow-sm">
                    {thread.u}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
