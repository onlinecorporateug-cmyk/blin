import React from 'react';
import { Shield, Trash2, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { Account, Clip, ReportItem } from '../types';
import { playTapSound } from '../utils/audio';

interface AdminViewProps {
  accounts: Account[];
  clips: Clip[];
  reports: ReportItem[];
  onToggleBan: (username: string) => void;
  onDeleteClip: (clipIndex: number) => void;
  onRemoveReportedClip: (handle: string, reportId: number) => void;
  onDismissReport: (reportId: number) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  accounts,
  clips,
  reports,
  onToggleBan,
  onDeleteClip,
  onRemoveReportedClip,
  onDismissReport
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-white flex items-center gap-1.5">
          <Shield className="w-5 h-5 text-[#22c55e]" />
          <span>Admin &amp; Safety Dashboard</span>
        </h2>
        <span className="text-[10px] font-bold bg-[#22c55e]/20 text-[#4ade80] px-2 py-0.5 rounded-full border border-[#22c55e]/40">
          Super Admin
        </span>
      </div>

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
        <div>
          <div className="font-black text-lg text-white">{accounts.length}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Accounts</div>
        </div>
        <div>
          <div className="font-black text-lg text-white">{clips.length}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Clips</div>
        </div>
        <div>
          <div className="font-black text-lg text-amber-400">{reports.length}</div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Reports</div>
        </div>
      </div>

      {/* Reports Queue */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Open Reports ({reports.length})</span>
        </h3>

        {reports.length === 0 ? (
          <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--border)] text-center text-xs text-gray-400">
            No open reports! Community vibes are clean 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-xs text-white">@{report.h}</span>
                    <span className="text-xs text-gray-400 ml-2">· {report.why}</span>
                  </div>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Flagged
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  {!report.sup && (
                    <button
                      onClick={() => {
                        onRemoveReportedClip(report.h, report.id);
                        playTapSound();
                      }}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove Clip</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDismissReport(report.id);
                      playTapSound();
                    }}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#1b261f] hover:bg-[#25352b] text-gray-300 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3 text-[#22c55e]" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Accounts List */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
          Registered Accounts ({accounts.length})
        </h3>

        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.u}
              className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <div className="font-extrabold text-xs text-white truncate flex items-center gap-1.5">
                  <span>{acc.name}</span>
                  {acc.role === 'admin' && (
                    <span className="text-[9px] font-bold bg-[#22c55e]/20 text-[#4ade80] px-1.5 py-0.2 rounded-full">
                      Admin
                    </span>
                  )}
                  {acc.role === 'creator' && (
                    <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full">
                      Creator
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400">
                  @{acc.u} · {acc.banned ? <span className="text-red-400 font-bold">Suspended</span> : 'Active'}
                </div>
              </div>

              {acc.role !== 'admin' && (
                <button
                  onClick={() => {
                    onToggleBan(acc.u);
                    playTapSound();
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 flex-none ${
                    acc.banned
                      ? 'bg-[#22c55e] text-[#04210f]'
                      : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  }`}
                >
                  <Ban className="w-3 h-3" />
                  <span>{acc.banned ? 'Unban' : 'Suspend'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Clips Management */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
          All Clips ({clips.length})
        </h3>

        <div className="space-y-2">
          {clips.map((clip, idx) => (
            <div
              key={clip.id || idx}
              className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{clip.t}</div>
                <div className="text-[11px] text-gray-400 truncate">
                  by @{clip.h} · {clip.l} likes · {clip.cm.length} comments
                </div>
              </div>

              <button
                onClick={() => {
                  onDeleteClip(idx);
                  playTapSound();
                }}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors flex items-center gap-1 flex-none"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
