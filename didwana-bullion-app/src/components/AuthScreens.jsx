import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  MessageCircle,
  Crown,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import { authApi } from '../services/api';
import { authStorage, consentStorage } from '../services/storage';
import bullionHero from '../assets/bullion-hero.jpg';
import dbLogoHdr from '../assets/db-logo-hdr.png';

function evaluatePassword(password) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const label = score <= 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  return { checks, score, label, valid: score === 5 };
}

export default function AuthScreens({ onAuthenticated, onOpenDoc }) {
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);
  const [slowWakeMsg, setSlowWakeMsg] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  const strength = useMemo(() => evaluatePassword(password), [password]);

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setSuccessMsg('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter your email or mobile number and password.');
      return;
    }

    setLoading(true);
    setSlowWakeMsg(false);
    const slowTimer = setTimeout(() => setSlowWakeMsg(true), 3000);
    try {
      const res = await authApi.login({ identifier, password });
      const token = res.token || res.accessToken || res.data?.token;
      const user = res.user || res.data?.user || { email: identifier.trim() };
      if (!token) throw new Error('Authentication token missing from server response.');

      authStorage.saveSession(token, user, rememberMe, res.refreshToken || null);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setSlowWakeMsg(false);
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');

    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!strength.valid) {
      setError('Password must meet all 5 security requirements.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedLegal) {
      setError('You must accept the Terms & Conditions, Privacy Policy, and Cookie Notice.');
      return;
    }

    setLoading(true);
    setSlowWakeMsg(false);
    const slowTimer = setTimeout(() => setSlowWakeMsg(true), 3000);
    try {
      const formattedPhone =
        cleanPhone.startsWith('91') && cleanPhone.length === 12
          ? `+${cleanPhone}`
          : `+91${cleanPhone.slice(-10)}`;

      const res = await authApi.register({
        name: fullName,
        email,
        phone: formattedPhone,
        password,
        acceptedLegal: true,
      });

      consentStorage.saveLegalConsent();

      const token = res.token || res.accessToken || res.data?.token;
      const user = res.user || res.data?.user || {
        name: fullName.trim(),
        email: email.trim(),
        phone: formattedPhone,
      };

      if (token) {
        authStorage.saveSession(token, user, true, res.refreshToken || null);
        onAuthenticated(user);
      } else {
        setSuccessMsg('Account created! Please sign in with your new credentials.');
        setMode('signin');
        setIdentifier(email.trim());
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Could not create account. Please try again.');
    } finally {
      clearTimeout(slowTimer);
      setSlowWakeMsg(false);
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim()) {
      setError('Enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(identifier);
      setSuccessMsg('If an account matches, password reset instructions have been sent.');
    } catch (err) {
      if (err.status === 404) {
        setError(
          `Self-service password reset is not enabled yet. Contact New Monika Jewellers at ${APP_INFO.contactPhone}.`
        );
      } else {
        setError(err.message || 'Unable to process reset request right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0B0907] text-[#F5F2EB] flex flex-col justify-between safe-bottom overflow-x-hidden">
      {/* Top Photographic Bullion Hero Banner (Replicating Studio 24K Bars & Coins) */}
      <div className="relative h-56 w-full overflow-hidden">
        <img
          src={bullionHero}
          alt="24K 999.9 Pure Gold Bullion Bars & Coins"
          className="h-full w-full object-cover object-center opacity-85"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(11,9,7,0.35) 0%, rgba(11,9,7,0.68) 60%, #0B0907 100%)',
          }}
        />

        {/* Overlaid Brand Crest & Live Tagline */}
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center px-4 text-center safe-top">
          <div className="flex flex-col items-center">
            <Crown className="h-4 w-4 text-[#E5C158]" />
            <div className="mt-0.5 h-12 w-12 overflow-hidden rounded-full border-2 border-[#D4AF37] bg-[#15100B] p-0.5 shadow-xl">
              <img
                src={dbLogoHdr}
                alt="DB Logo"
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          </div>
          <h1 className="font-serif-luxury mt-1.5 text-2xl font-bold tracking-[0.06em] text-[#E5C158] uppercase drop-shadow">
            {APP_INFO.name}
          </h1>
          <p className="text-[11px] font-medium text-[#E6DFD5]">
            New Monika Jewellers • Purity &amp; Commitment
          </p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#15100B]/90 px-3 py-1 text-[10px] font-semibold text-[#E5C158]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#148A14]" />
            GOLD 995 • SILVER PETI • JODHPUR &amp; SUJANGARH
          </div>
        </div>
      </div>

      {/* Overlapping Smoked-Bronze Auth Card */}
      <div className="relative z-10 mx-auto w-full max-w-md px-4 pb-6 pt-2 flex-1 flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="rounded-2xl border border-[#4A371E] bg-[#15100B]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)]"
          >
            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>
            ) : (
              <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#0B0907] p-1 border border-[#3D2E1A]">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`rounded-lg py-2 text-xs font-bold tracking-wider uppercase transition ${
                    mode === 'signin'
                      ? 'bg-gradient-to-r from-[#E5C158] to-[#C69749] text-[#0B0907] shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`rounded-lg py-2 text-xs font-bold tracking-wider uppercase transition ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-[#E5C158] to-[#C69749] text-[#0B0907] shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-300">
                    Mobile Number (+91) or Email
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <span className="absolute left-9 text-xs font-bold text-[#D4AF37]">+91</span>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="9351214851 or email"
                      autoComplete="username"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-3 pl-18 pr-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-zinc-300">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 text-zinc-400 hover:text-zinc-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#D4AF37]"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="font-semibold text-[#D4AF37] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5C158] via-[#D4AF37] to-[#B8892D] py-3.5 text-xs font-extrabold tracking-wider text-[#0B0907] uppercase shadow-lg active:scale-[0.99] transition disabled:opacity-60"
                >
                  <span>
                    {loading
                      ? slowWakeMsg
                        ? 'Waking Secure Server...'
                        : 'Connecting Terminals...'
                      : 'Sign In to Liverate Desk'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name / firm name"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-2.5 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                    Mobile Number (+91)
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <span className="absolute left-9 text-xs font-bold text-[#D4AF37]">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9351214851"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-2.5 pl-18 pr-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, A-Z, a-z, 0-9, !@#$"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-zinc-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full ${
                          strength.score >= n
                            ? strength.score <= 2
                              ? 'bg-red-500'
                              : strength.score <= 4
                              ? 'bg-amber-400'
                              : 'bg-emerald-500'
                            : 'bg-white/10'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] font-semibold text-zinc-400">{strength.label}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-2.5 pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 text-zinc-400"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 rounded-xl border border-[#3D2E1A] bg-[#0B0907] p-3 text-xs leading-relaxed text-zinc-300">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
                  />
                  <span>
                    I accept the{' '}
                    <button type="button" onClick={() => onOpenDoc('terms')} className="text-[#D4AF37] underline">
                      Terms
                    </button>
                    ,{' '}
                    <button type="button" onClick={() => onOpenDoc('privacy')} className="text-[#D4AF37] underline">
                      Privacy Policy
                    </button>{' '}
                    &amp;{' '}
                    <button type="button" onClick={() => onOpenDoc('cookies')} className="text-[#D4AF37] underline">
                      Cookies
                    </button>
                    .
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5C158] via-[#D4AF37] to-[#B8892D] py-3.5 text-xs font-extrabold tracking-wider text-[#0B0907] uppercase shadow-lg disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>{loading ? 'Creating Account...' : 'Create Trade Account'}</span>
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-xs leading-relaxed text-zinc-400">
                  Enter your registered email or mobile number. For instant support, contact our trade desk on {APP_INFO.contactPhone}.
                </p>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-[#D4AF37]" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Registered email or mobile"
                    className="w-full rounded-xl border border-[#3D2E1A] bg-[#0B0907] py-3 pl-10 pr-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#E5C158] to-[#C69749] py-3 text-xs font-extrabold uppercase text-[#0B0907]"
                >
                  {loading ? 'Submitting...' : 'Request Reset'}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Trade Desk Booking Bar (Exact Stitch Match) */}
        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-[#3D2E1A] bg-[#15100B] px-3.5 py-2.5 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={dbLogoHdr}
              alt="Booking Desk"
              className="h-9 w-9 shrink-0 rounded-full border border-[#D4AF37]/50 object-cover"
            />
            <div className="min-w-0">
              <div className="text-[9px] font-bold tracking-widest text-[#D4AF37] uppercase">
                Booking Number
              </div>
              <div className="font-mono-price text-xs font-bold text-white">
                {APP_INFO.contactPhone}
              </div>
              <div className="truncate text-[10px] text-zinc-400">Station Road, Didwana</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/${APP_INFO.whatsappPhone}`}
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp Trade Desk"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#148A14] text-white shadow"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
            <a
              href={`tel:${APP_INFO.contactPhone.replace(/\s+/g, '')}`}
              aria-label="Call Trade Desk"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#E5C158] to-[#C69749] text-[#0B0907] shadow"
            >
              <Phone className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
