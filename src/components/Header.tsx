import React, { useState } from 'react';
import { Shield, Crown, LogOut, Settings as SettingsIcon, User, Home, Compass, PlusCircle, MessageSquare, UserCircle, Globe } from 'lucide-react';
import { Account, Role } from '../types';

interface HeaderProps {
  user: Account | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  unreadMessagesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenSettings,
  currentTab = 'home',
  onTabChange,
  unreadMessagesCount = 0
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'disc', label: 'Discover', icon: Compass },
    { id: 'studio', label: 'Create', icon: PlusCircle },
    { id: 'msg', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { id: 'prof', label: 'Profile', icon: UserCircle }
  ];

  if (user?.role === 'admin') {
    navLinks.push({ id: 'admin', label: 'Admin', icon: Shield, badge: 0 });
  }

  return (
    <header className="relative z-30 px-4 md:px-8 py-3 flex items-center justify-between border-b border-[#1b261f] bg-[var(--bg)]/95 backdrop-blur-md">
      {/* Brand & Badges */}
      <div className="flex items-center gap-3">
        <h1
          onClick={() => onTabChange?.('home')}
          className="text-2xl md:text-3xl font-black tracking-tight gradient-text cursor-pointer select-none hover:opacity-90 transition-opacity"
        >
          BLiN
        </h1>

        {user?.role === 'admin' && (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 rounded-full px-2.5 py-0.5">
            <Shield className="w-3 h-3" />
            Admin
          </span>
        )}
        {user?.role === 'creator' && (
          <span className="flex items-center gap-1 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full px-2.5 py-0.5">
            <Crown className="w-3 h-3" />
            Creator
          </span>
        )}

        {/* Live Vercel & Supabase indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111c14] border border-[#233528] text-[10px] text-gray-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
          <span>Vercel + Supabase Auth</span>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      {user && onTabChange && (
        <nav className="hidden md:flex items-center gap-1 bg-[#101712] border border-[#1e2a21] p-1 rounded-full shadow-inner">
          {navLinks.map((tab) => {
            const isActive = currentTab === tab.id || (tab.id === 'prof' && currentTab === 'settings');
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all relative ${
                  isActive
                    ? 'bg-[#22c55e] text-[#04210f] shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-[#19241c]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="bg-[#a3e635] text-[#04210f] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* User Actions */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-gray-200 transition-all shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
              <span className="truncate max-w-[120px]">@{user.u}</span>
            </button>

            {showAccountMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAccountMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-[#121915] border border-[#27372d] shadow-2xl p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#233128] mb-1">
                    <div className="font-extrabold text-white truncate text-sm">{user.name}</div>
                    <div className="text-[11px] text-gray-400 truncate">@{user.u} · {user.em}</div>
                    <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                      <Globe className="w-3 h-3" />
                      <span>Account active (Vercel)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:bg-[#1b261f] flex items-center gap-2.5 transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-[#22c55e]" />
                    <span>Settings &amp; Storage</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAccountMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#121a14] border border-[#1f2c22]">
            <User className="w-3.5 h-3.5 text-[#22c55e]" />
            <span>Ready for Vercel</span>
          </div>
        )}
      </div>
    </header>
  );
};
