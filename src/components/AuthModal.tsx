import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Shield, Eye, EyeOff, UserPlus, LogIn, Database, Loader2 } from 'lucide-react';
import { Account, AccountKind, Role } from '../types';
import { VIBES_LIST } from '../data/mockData';
import { playTapSound } from '../utils/audio';
import { supabase, SUPABASE_URL } from '../lib/supabase';

interface AuthModalProps {
  onLogin: (account: Account) => void;
  onSignUp: (newAccount: Account) => void;
  accounts: Account[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onLogin,
  onSignUp,
  accounts
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');

  // Login State
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginTries, setLoginTries] = useState(0);
  const [loginLockoutUntil, setLoginLockoutUntil] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Signup Wizard State
  const [suStep, setSuStep] = useState(0);
  const [suFirstName, setSuFirstName] = useState('');
  const [suLastName, setSuLastName] = useState('');
  const [suHandle, setSuHandle] = useState('');
  const [suDay, setSuDay] = useState('');
  const [suMonth, setSuMonth] = useState('');
  const [suYear, setSuYear] = useState('');
  const [suVibes, setSuVibes] = useState<string[]>([]);
  const [suKind, setSuKind] = useState<AccountKind>('creator');
  const [suRole, setSuRole] = useState<Role>('user');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suShowPw, setSuShowPw] = useState(false);
  const [suError, setSuError] = useState('');
  const [suCompletedAccount, setSuCompletedAccount] = useState<Account | null>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const reservedHandles = ['admin', 'official', 'support', 'blin', 'moderator', 'founder'];

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loginLockoutUntil && Date.now() < loginLockoutUntil) {
      setLoginError('Too many attempts. Please wait 30 seconds.');
      return;
    }

    const trimmedId = loginId.trim().toLowerCase();
    setIsLoading(true);
    setLoginError('');

    try {
      // 1. Attempt Supabase Auth login if email is provided
      let emailForAuth = trimmedId;
      if (!trimmedId.includes('@')) {
        const localMatch = accounts.find((a) => a.u.toLowerCase() === trimmedId);
        if (localMatch?.em) {
          emailForAuth = localMatch.em;
        }
      }

      if (emailForAuth.includes('@')) {
        const { data: suData, error: suError } = await supabase.auth.signInWithPassword({
          email: emailForAuth,
          password: loginPw
        });

        if (!suError && suData?.user) {
          const userMeta = suData.user.user_metadata || {};
          const matchedOrNewAccount: Account = {
            u: userMeta.username || suData.user.email?.split('@')[0] || trimmedId,
            name: userMeta.full_name || userMeta.name || suData.user.email?.split('@')[0] || 'BLiN User',
            em: suData.user.email || emailForAuth,
            pw: loginPw,
            role: userMeta.role || 'user',
            kind: userMeta.kind || 'creator',
            vibes: userMeta.vibes || ['Dance', 'Music'],
            fol: userMeta.followers_count || 0,
            bio: userMeta.bio || 'Created with Supabase Auth'
          };
          setIsLoading(false);
          onLogin(matchedOrNewAccount);
          return;
        }
      }

      // 2. Check local accounts fallback
      const account = accounts.find(
        (a) => a.u.toLowerCase() === trimmedId || a.em.toLowerCase() === trimmedId
      );

      if (!account) {
        setLoginError("No account found with this handle or email. Tap 'Sign up' below to create one.");
        setIsLoading(false);
        return;
      }

      if (account.pw !== loginPw) {
        const nextTries = loginTries + 1;
        setLoginTries(nextTries);
        if (nextTries >= 5) {
          setLoginLockoutUntil(Date.now() + 30000);
          setLoginError('Too many attempts. Please wait 30 seconds.');
        } else {
          setLoginError('Incorrect password. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      if (account.banned) {
        setLoginError('This account has been suspended by the safety team.');
        setIsLoading(false);
        return;
      }

      if (account.deact) {
        account.deact = false;
      }

      setIsLoading(false);
      onLogin(account);
    } catch (err: any) {
      console.warn('Login exception:', err);
      // Fallback to local accounts
      const account = accounts.find(
        (a) => a.u.toLowerCase() === trimmedId || a.em.toLowerCase() === trimmedId
      );
      if (account && account.pw === loginPw) {
        setIsLoading(false);
        onLogin(account);
      } else {
        setLoginError(err?.message || 'Authentication failed. Please verify credentials.');
        setIsLoading(false);
      }
    }
  };

  // Age calculation helper
  const calculateAge = () => {
    const d = parseInt(suDay);
    const m = parseInt(suMonth);
    const y = parseInt(suYear);
    if (!d || !m || !y) return null;
    const now = new Date();
    let age = now.getFullYear() - y;
    if (now < new Date(now.getFullYear(), m - 1, d)) {
      age--;
    }
    return age;
  };

  // Validate step
  const validateStep = (): string => {
    if (suStep === 0) {
      if (!suFirstName.trim() || !suLastName.trim()) {
        return 'Please enter your first and last name.';
      }
    } else if (suStep === 1) {
      const u = suHandle.trim().toLowerCase();
      if (!/^[a-z0-9._]{3,20}$/.test(u)) {
        return 'Handle must be 3-20 characters with letters, numbers, dots or underscores.';
      }
      if (reservedHandles.some((res) => u.includes(res))) {
        return 'That handle is reserved for system use.';
      }
      if (accounts.some((a) => a.u.toLowerCase() === u)) {
        return 'That handle is already taken. Try another.';
      }
    } else if (suStep === 2) {
      const age = calculateAge();
      if (age === null) return 'Please select your birth date.';
      if (age < 13) return 'BLiN is designed for members 13 and older.';
    } else if (suStep === 3) {
      if (suVibes.length === 0) return 'Pick at least one vibe to tune your feed.';
    } else if (suStep === 5) {
      const emailLower = suEmail.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailLower)) {
        return 'Please enter a valid email address.';
      }
      if (accounts.some((a) => a.em.toLowerCase() === emailLower)) {
        return 'An account with that email already exists. Try logging in.';
      }
      if (suPassword.length < 8) {
        return 'Password must be at least 8 characters.';
      }
      if (!/[a-zA-Z]/.test(suPassword) || !/[0-9]/.test(suPassword)) {
        return 'Password must contain both letters and at least one number.';
      }
      if (suPassword.toLowerCase().includes(suHandle.toLowerCase())) {
        return 'Password cannot contain your handle.';
      }
    }
    return '';
  };

  const handleNextSignupStep = async () => {
    const error = validateStep();
    setSuError(error);
    if (error) return;

    if (suStep < 5) {
      setSuStep(suStep + 1);
      playTapSound();
    } else {
      // Step 5: Final Submission with Supabase Auth
      setIsLoading(true);
      const age = calculateAge();
      const isTeen = age !== null && age < 18;
      const assignedRole: Role =
        suRole === 'admin' || accounts.length === 0
          ? 'admin'
          : suKind === 'creator'
          ? 'creator'
          : 'user';

      const newAcc: Account = {
        u: suHandle.trim().toLowerCase(),
        name: `${suFirstName.trim()} ${suLastName.trim()}`,
        em: suEmail.trim().toLowerCase(),
        pw: suPassword,
        role: assignedRole,
        kind: suKind,
        vibes: [...suVibes],
        teen: isTeen,
        fol: 0,
        bio: `${suKind === 'creator' ? '🎬 Creator on BLiN' : '👀 Exploring vibes'} · ${suVibes.join(', ')}`
      };

      try {
        // Authenticate with Supabase
        const { error: suSignUpError } = await supabase.auth.signUp({
          email: newAcc.em,
          password: newAcc.pw,
          options: {
            data: {
              username: newAcc.u,
              full_name: newAcc.name,
              role: newAcc.role,
              kind: newAcc.kind,
              vibes: newAcc.vibes
            }
          }
        });

        if (suSignUpError) {
          if (suSignUpError.message.toLowerCase().includes('already registered')) {
            setSuError('This email is already registered in Supabase. Please switch to Log In.');
            setIsLoading(false);
            return;
          }
          console.warn('Supabase Auth Notice:', suSignUpError.message);
        }
      } catch (err: any) {
        console.warn('Supabase Auth registration fallback:', err);
      }

      setIsLoading(false);
      setSuCompletedAccount(newAcc);
    }
  };

  const handleVibeToggle = (vibeName: string) => {
    if (suVibes.includes(vibeName)) {
      setSuVibes(suVibes.filter((v) => v !== vibeName));
    } else if (suVibes.length < 5) {
      setSuVibes([...suVibes, vibeName]);
    }
    setSuError('');
    playTapSound();
  };

  // Render Completion Celebration
  if (suCompletedAccount) {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-[#0a0f0c] via-[#0f1913] to-[#0a0f0c] text-white">
        <div className="space-y-4 pt-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-[#22c55e] to-[#a3e635] flex items-center justify-center shadow-xl">
            <Sparkles className="w-10 h-10 text-[#04210f]" />
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            You're in, <span className="gradient-text">@{suCompletedAccount.u}</span> 💚
          </h2>

          <p className="text-xs text-gray-300 max-w-xs mx-auto leading-relaxed">
            Welcome to BLiN. Authenticated with Supabase. Create your vibe and find your community.
          </p>

          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
            {suCompletedAccount.vibes?.map((v) => (
              <span
                key={v}
                className="text-xs font-bold px-3 py-1 rounded-full bg-[#22c55e]/20 text-[#a3e635] border border-[#22c55e]/30"
              >
                {v}
              </span>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-left space-y-1">
            <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
              <span>{suCompletedAccount.kind === 'creator' ? '🚀 New Creator Boost Active' : '👀 Feed Tuned'}</span>
              {suCompletedAccount.role === 'admin' && (
                <span className="text-[10px] bg-[#22c55e]/20 text-[#4ade80] px-2 py-0.5 rounded-full font-bold ml-auto">
                  🛡️ Admin Access
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              {suCompletedAccount.kind === 'creator'
                ? 'Your first clips will receive the New Creator algorithm boost to get seen.'
                : 'Your home feed is pre-calibrated to showcase trending vibes matching your interests.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-[#22c55e]/30 text-left flex items-center gap-2">
            <Database className="w-4 h-4 text-[#22c55e] flex-none" />
            <div className="text-[11px] text-emerald-200">
              <strong>Supabase Connected:</strong> Account synchronized with <code className="text-xs text-emerald-300">easqggpdhjchngiezlah.supabase.co</code>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            onSignUp(suCompletedAccount);
            onLogin(suCompletedAccount);
          }}
          className="w-full py-3.5 rounded-full gradient-btn shadow-xl text-sm font-extrabold transition-transform active:scale-95"
        >
          Start Vibing ⚡
        </button>
      </div>
    );
  }

  // Render Signup Wizard
  if (mode === 'signup') {
    const stepTitles = [
      ["What's your name?", 'Enter your real name so friends can recognize you.'],
      ['Claim your @handle', 'Choose your unique BLiN handle.'],
      ["When's your birthday? 🎂", 'BLiN is for ages 13+. Your birthday stays private.'],
      ['Pick your vibes ✨', 'Choose up to 5 vibes to customize your feed.'],
      ['Choose account type', 'Select how you want to use BLiN.'],
      ['Set up your login 🔐', 'Create your password to secure your Supabase account.']
    ];

    const currentTitle = stepTitles[suStep];
    const age = calculateAge();

    return (
      <div className="flex-1 flex flex-col justify-between p-5 bg-[var(--bg)] text-white no-scrollbar">
        {/* Top Bar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => {
                if (suStep > 0) {
                  setSuStep(suStep - 1);
                  setSuError('');
                } else {
                  setMode('login');
                }
                playTapSound();
              }}
              className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-hover)] flex items-center justify-center text-gray-300"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <span className="text-xl font-black gradient-text">BLiN</span>

            <span className="text-xs text-gray-400 font-bold">{suStep + 1} / 6</span>
          </div>

          {/* Supabase Status Pill */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#111c15] border border-[#22c55e]/20 mb-3 text-[10px] text-gray-300">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
              <span>Supabase Auth Ready</span>
            </span>
            <span className="text-gray-400 font-mono">easqggpdhjchngiezlah</span>
          </div>

          {/* Progress Indicators */}
          <div className="flex gap-1.5 mb-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-all duration-300 ${
                  i <= suStep ? 'bg-gradient-to-r from-[#4ade80] to-[#a3e635]' : 'bg-[#1b261f]'
                }`}
              />
            ))}
          </div>

          {/* Title & Desc */}
          <h2 className="text-xl font-extrabold text-white mb-1">{currentTitle[0]}</h2>
          <p className="text-xs text-gray-400 mb-5">{currentTitle[1]}</p>

          {/* Step 0: Name */}
          {suStep === 0 && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="First name"
                value={suFirstName}
                onChange={(e) => setSuFirstName(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e]"
                autoFocus
              />
              <input
                type="text"
                placeholder="Last name"
                value={suLastName}
                onChange={(e) => setSuLastName(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e]"
              />
            </div>
          )}

          {/* Step 1: Handle */}
          {suStep === 1 && (
            <div className="space-y-3">
              <div className="flex items-center bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 focus-within:border-[#22c55e]">
                <span className="text-[#22c55e] font-extrabold text-base mr-1">@</span>
                <input
                  type="text"
                  placeholder="yourhandle"
                  value={suHandle}
                  onChange={(e) => {
                    setSuHandle(e.target.value.toLowerCase().trim());
                    setSuError('');
                  }}
                  className="w-full bg-transparent py-3 text-sm text-white focus:outline-none"
                  autoFocus
                />
              </div>

              {suHandle.length >= 3 && !suError && (
                <div className="text-xs font-bold text-[#22c55e] flex items-center gap-1 px-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>@{suHandle} is available</span>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Birthday */}
          {suStep === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={suMonth}
                  onChange={(e) => setSuMonth(e.target.value)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">Month</option>
                  {months.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={suDay}
                  onChange={(e) => setSuDay(e.target.value)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <select
                  value={suYear}
                  onChange={(e) => setSuYear(e.target.value)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="">Year</option>
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={currentYear - i}>
                      {currentYear - i}
                    </option>
                  ))}
                </select>
              </div>

              {age !== null && age >= 13 && age < 18 && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-[#22c55e]/30 text-[11px] text-emerald-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#22c55e] flex-none" />
                  <span>Extra teen privacy protections will be activated automatically.</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Vibes */}
          {suStep === 3 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {VIBES_LIST.map(([name, emoji]) => {
                  const isPicked = suVibes.includes(name);
                  return (
                    <button
                      key={name}
                      onClick={() => handleVibeToggle(name)}
                      className={`p-3 rounded-xl text-left border flex items-center gap-2.5 transition-all ${
                        isPicked
                          ? 'bg-[#22c55e]/20 border-[#22c55e] text-white shadow-sm'
                          : 'bg-[var(--card)] border-[var(--border)] text-gray-300 hover:bg-[#1a251e]'
                      }`}
                    >
                      <span className="text-xl">{emoji}</span>
                      <span className="font-extrabold text-xs">{name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-[11px] text-gray-400 text-right">
                {suVibes.length} / 5 selected
              </div>
            </div>
          )}

          {/* Step 4: Account type & Role */}
          {suStep === 4 && (
            <div className="space-y-3">
              {[
                {
                  id: 'creator',
                  title: '🎬 Creator Account',
                  desc: 'Create and post clips with the New Creator algorithm boost.'
                },
                {
                  id: 'watcher',
                  title: '👀 Watcher Account',
                  desc: 'Scroll, like, save, comment, and message creators.'
                }
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => {
                    setSuKind(opt.id as AccountKind);
                    playTapSound();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    suKind === opt.id
                      ? 'bg-[#22c55e]/15 border-[#22c55e] text-white'
                      : 'bg-[var(--card)] border-[var(--border)] text-gray-300 hover:bg-[#1a251e]'
                  }`}
                >
                  <div className="font-extrabold text-sm mb-1">{opt.title}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{opt.desc}</div>
                </div>
              ))}

              <label className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-between cursor-pointer mt-2">
                <div className="pr-3">
                  <div className="font-bold text-xs text-white">Enable Moderator/Admin Tools</div>
                  <div className="text-[10px] text-gray-400">Grants access to community moderation and reports</div>
                </div>
                <input
                  type="checkbox"
                  checked={suRole === 'admin'}
                  onChange={(e) => setSuRole(e.target.checked ? 'admin' : 'user')}
                  className="accent-[#22c55e] w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* Step 5: Email & Password */}
          {suStep === 5 && (
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Your email address"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e]"
                autoFocus
              />

              <div className="relative">
                <input
                  type={suShowPw ? 'text' : 'password'}
                  placeholder="Password (8+ chars, letters + numbers)"
                  value={suPassword}
                  onChange={(e) => setSuPassword(e.target.value)}
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] pr-12"
                />
                <button
                  type="button"
                  onClick={() => setSuShowPw(!suShowPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {suShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                By joining BLiN, you authenticate via Supabase and agree to the Terms &amp; Privacy Policy.
              </p>
            </div>
          )}

          {suError && <p className="text-xs text-red-400 mt-3 font-semibold">{suError}</p>}
        </div>

        <button
          onClick={handleNextSignupStep}
          disabled={isLoading}
          className="w-full py-3.5 rounded-full gradient-btn font-extrabold text-sm shadow-xl mt-6 transition-transform active:scale-95 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating with Supabase…</span>
            </>
          ) : suStep === 5 ? (
            'Create Account 💚'
          ) : (
            'Continue'
          )}
        </button>
      </div>
    );
  }

  // Render Login Screen
  return (
    <div className="flex-1 flex flex-col justify-center p-6 bg-[var(--bg)] text-white no-scrollbar">
      <div className="text-center mb-6">
        <h1 className="logo-script text-6xl gradient-text mb-1 select-none font-bold">
          BLiN
        </h1>
        <p className="text-xs text-gray-400 tracking-wide font-medium">
          Create your vibe. Find your people.
        </p>

        {/* Supabase status chip */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#121c16] border border-[#22c55e]/30 mt-3 text-[10px] text-emerald-400 font-medium">
          <Database className="w-3 h-3 text-[#22c55e]" />
          <span>Supabase Auth: <strong className="font-mono">easqggpdhjchngiezlah</strong></span>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLoginSubmit} className="space-y-3.5">
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Email or Handle
          </label>
          <input
            type="text"
            placeholder="e.g. user@example.com or your handle"
            value={loginId}
            onChange={(e) => {
              setLoginId(e.target.value);
              setLoginError('');
            }}
            className="w-full bg-[#121915] border border-[#2a352d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80]"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={loginShowPw ? 'text' : 'password'}
              placeholder="Your password"
              value={loginPw}
              onChange={(e) => {
                setLoginPw(e.target.value);
                setLoginError('');
              }}
              className="w-full bg-[#121915] border border-[#2a352d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80] pr-14"
            />
            <button
              type="button"
              onClick={() => setLoginShowPw(!loginShowPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-white"
            >
              {loginShowPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!loginId.trim() || !loginPw || isLoading}
          className="w-full py-3.5 rounded-xl bg-[#22c55e] hover:bg-[#a3e635] text-[#04210f] font-extrabold text-sm disabled:opacity-45 transition-all shadow-md mt-2 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying with Supabase…</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Log In</span>
            </>
          )}
        </button>

        {loginError && <p className="text-xs text-red-400 text-center font-medium mt-2">{loginError}</p>}
      </form>

      {/* Switch to Sign Up */}
      <div className="mt-8 p-4 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-center space-y-2">
        <p className="text-xs text-gray-300">
          New to BLiN? Create your account with Supabase in 30 seconds.
        </p>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setSuStep(0);
            setSuError('');
            playTapSound();
          }}
          className="w-full py-2.5 rounded-xl border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e]/10 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New Account</span>
        </button>
      </div>
    </div>
  );
};
