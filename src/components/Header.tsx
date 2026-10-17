import React, { useState } from 'react';
import { Shield, Crown, Smartphone, Monitor, LogOut, Settings as SettingsIcon, User } from 'lucide-react';
import { Account } from '../types';

interface HeaderProps {
  user: Account | null;
  onLogout: () => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  isMobileFrame,
  onToggleFrame,
  onOpenSettings
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  return (
    <header className="relative z-30 px-4 py-2.5 flex items-center justify-between border-b border-[#1b261f] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-black tracking-tight gradient-text cursor-pointer select-none">
          BLiN
        </h1>
        {user?.role === 'admin' && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 rounded-full px-2 py-0.5">
            <Shield className="w-2.5 h-2.5" />
            Admin
          </span>
        )}
        {user?.role === 'creator' && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full px-2 py-0.5">
            <Crown className="w-2.5 h-2.5" />
            Creator
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Viewport switch for desktop users */}
        <button
          onClick={onToggleFrame}
          title={isMobileFrame ? "Switch to Fullscreen View" : "Switch to Mobile Device Frame"}
          className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] text-gray-300 transition-colors"
        >
          {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-[#22c55e]" />}
        </button>

        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-gray-200 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="truncate max-w-[95px]">@{user.u}</span>
            </button>

            {showAccountMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAccountMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#121915] border border-[#27372d] shadow-2xl p-2 z-50 text-xs">
                  <div className="px-2 py-1.5 border-b border-[#233128] mb-1">
                    <div className="font-extrabold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">@{user.u} · {user.em}</div>
                  </div>

                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-gray-300 hover:bg-[#1b261f] flex items-center gap-2 transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>Settings &amp; Privacy</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>Not signed in</span>
          </div>
        )}
      </div>
    </header>
  );
};
