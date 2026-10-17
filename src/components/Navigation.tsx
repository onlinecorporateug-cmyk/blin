import React from 'react';
import { Role } from '../types';

interface NavigationProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  unreadMessagesCount: number;
  userRole?: Role;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  unreadMessagesCount,
  userRole
}) => {
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 64 64" className="w-7 h-7">
          <circle cx="32" cy="32" r="28" fill="url(#nav-chrome)" />
          <circle cx="32" cy="32" r="22" fill="#0a0a0a" />
          <path d="M36 13 21 36h10l-3 15 15-23H33z" fill="#f3f4f6" />
        </svg>
      )
    },
    {
      id: 'disc',
      label: 'Discover',
      icon: (
        <svg viewBox="0 0 64 64" className="w-7 h-7">
          <path d="M11 20C4 31 7 47 21 57" stroke="#e5e7eb" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <circle cx="37" cy="32" r="25" fill="#e5e7eb" />
          <polygon points="37,15 48,32 37,49 26,32" transform="rotate(38 37 32)" fill="#0a0f0c" />
          <circle cx="37" cy="32" r="4.5" fill="#e5e7eb" />
        </svg>
      )
    },
    {
      id: 'studio',
      label: 'Create',
      icon: (
        <svg viewBox="0 0 64 64" className="w-8 h-8">
          <circle cx="32" cy="32" r="28" fill="url(#nav-pop)" />
          <path d="M32 19v26M19 32h26" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: 'msg',
      label: 'Messages',
      badge: unreadMessagesCount,
      icon: (
        <svg viewBox="0 0 64 64" className="w-7 h-7">
          <path d="M32 5C16 5 4 15 4 29c0 8 4 14 11 18-1 5-3 8-6 11 7 0 12-3 16-6 2 .5 4 .7 7 .7 16 0 28-10 28-23S48 5 32 5z" fill="url(#nav-chrome)" />
          <path d="M32 10C19 10 9 18 9 29c0 7 4 12 10 15l1.5.8-1 2c-.8 1.5-1.8 3-3 4.4 4-.6 7.5-2.4 10.4-4.8l.7-.6 1 .2c1.3.2 2.6.4 4 .4 13 0 23-8 23-18S45 10 32 10z" fill="#0a0a0a" />
        </svg>
      )
    },
    {
      id: 'prof',
      label: 'Profile',
      icon: (
        <svg viewBox="0 0 64 64" className="w-7 h-7">
          <circle cx="32" cy="32" r="28" fill="#5a5a5a" />
          <circle cx="32" cy="25" r="9.5" fill="#c8c8c8" />
          <path d="M12.5 49C15.5 40 23 36 32 36s16.5 4 19.5 13A28 28 0 0 1 12.5 49z" fill="#c8c8c8" />
        </svg>
      )
    }
  ];

  if (userRole === 'admin') {
    tabs.push({
      id: 'admin',
      label: 'Admin',
      icon: (
        <svg viewBox="0 0 64 64" className="w-7 h-7">
          <circle cx="32" cy="32" r="28" fill="url(#nav-chrome)" />
          <circle cx="32" cy="32" r="22" fill="#0a0a0a" />
          <path d="M32 15l13 5v10c0 9-6 15-13 18-7-3-13-9-13-18V20z" fill="#f3f4f6" />
        </svg>
      )
    });
  }

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="nav-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.45" stopColor="#8b92a0" />
            <stop offset="0.75" stopColor="#f3f4f6" />
            <stop offset="1" stopColor="#6b7280" />
          </linearGradient>
          <linearGradient id="nav-pop" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22c55e" />
            <stop offset="1" stopColor="#a3e635" />
          </linearGradient>
        </defs>
      </svg>
      <nav className="relative z-20 flex justify-around items-center pt-2 pb-3 px-1 border-t border-[#1b261f] bg-[var(--bg)]/95 backdrop-blur-md">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id || (tab.id === 'prof' && currentTab === 'settings');
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 transition-transform ${
                isActive ? 'text-white scale-105' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <div
                  className={`transition-all duration-200 ${
                    isActive
                      ? 'opacity-100 drop-shadow-[0_0_8px_rgba(34,197,94,0.7)]'
                      : 'opacity-60'
                  }`}
                >
                  {tab.icon}
                </div>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-[#a3e635] text-[#04210f] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full shadow-sm leading-none flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
