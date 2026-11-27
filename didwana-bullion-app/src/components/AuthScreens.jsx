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
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import { authApi } from '../services/api';
import { authStorage, consentStorage } from '../services/storage';
import { GoldCrest } from './SplashGate';
import { ShimmerButton } from './ui/ShimmerButton';

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
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
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
    <div className="relative min-h-screen overflow-hidden bg-[#090B10] px-5 py-8 flex flex-col justify-center safe-top safe-bottom">
      {/* Subtle Ambient Gold Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.28) 0%, rgba(9,11,16,0) 70%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-md">
        {/* Institutional Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <GoldCrest size={58} />
          <h1 className="mt-3.5 text-xl font-bold tracking-[0.16em] text-[#E6CB94] uppercase">
            {mode === 'signin'
              ? 'Terminal Sign In'
              : mode === 'signup'
              ? 'Create Account'
              : 'Reset Password'}
          </h1>
          <p className="mt-1 text-[11px] tracking-[0.2em] text-zinc-400 uppercase">
            {APP_INFO.name} • {APP_INFO.tagline}
          </p>
        </div>

        {/* Sleek Dark Glassmorphic Card (No Cheap Yellow Block) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-[#D4AF37]/20 bg-[#111520]/95 p-6 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]"
          >
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </button>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Email or Mobile Number
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="you@example.com or 9521014851"
                      autoComplete="username"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-200"
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
                      className="h-4 w-4 rounded border-white/20 bg-[#090B10] accent-[#D4AF37]"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="font-medium text-[#D4AF37] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <ShimmerButton type="submit" disabled={loading} className="w-full py-3.5">
                  <span>
                    {loading
                      ? slowWakeMsg
                        ? 'Waking Secure Server...'
                        : 'Signing In...'
                      : 'Sign In to Live Terminals'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </ShimmerButton>

                <div className="pt-1 text-center text-xs text-zinc-400">
                  New to Didwana Bullion?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-bold text-[#E6CB94] hover:underline"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Mobile Number (+91)
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <span className="absolute left-10 text-xs font-semibold text-zinc-400">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9521014851"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-18 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, A-Z, a-z, 0-9, !@#$"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-zinc-400">Password strength</span>
                        <span className="font-bold text-[#E6CB94]">{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full ${
                              strength.score >= i ? 'bg-[#D4AF37]' : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-xl border border-white/10 bg-[#090B10] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-2.5 text-zinc-400"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed text-zinc-400">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#090B10] accent-[#D4AF37]"
                  />
                  <span>
                    I accept{' '}
                    <button type="button" onClick={() => onOpenDoc('terms')} className="text-[#E6CB94] underline">
                      Terms
                    </button>
                    ,{' '}
                    <button type="button" onClick={() => onOpenDoc('privacy')} className="text-[#E6CB94] underline">
                      Privacy
                    </button>{' '}
                    &amp;{' '}
                    <button type="button" onClick={() => onOpenDoc('cookies')} className="text-[#E6CB94] underline">
                      Cookies
                    </button>
                    .
                  </span>
                </label>

                <ShimmerButton type="submit" disabled={loading} className="w-full py-3.5">
                  <span>
                    {loading
                      ? slowWakeMsg
                        ? 'Waking Secure Server...'
                        : 'Creating Account...'
                      : 'Create Secure Account'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </ShimmerButton>

                <div className="pt-1 text-center text-xs text-zinc-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-bold text-[#E6CB94] hover:underline"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Enter your registered email address to request a password reset.
                </p>
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#090B10] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#D4AF37] focus:outline-none"
                />
                <ShimmerButton type="submit" disabled={loading} className="w-full py-3">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </ShimmerButton>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>TLS Encrypted • {APP_INFO.address}</span>
        </div>
      </div>
    </div>
  );
}
