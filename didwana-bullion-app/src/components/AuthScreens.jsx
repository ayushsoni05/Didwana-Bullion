import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { APP_INFO } from '../config/constants';
import { authApi } from '../services/api';
import { authStorage, consentStorage } from '../services/storage';
import { GoldCrest } from './SplashGate';

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#0A0A0A] to-[#121212] px-6 py-10 flex flex-col justify-center safe-top safe-bottom">
      {/* Faint Concentric Gold Watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -top-24 left-1/2 h-[390px] w-[390px] -translate-x-1/2 opacity-10"
      >
        {[90, 130, 170].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#C5A358" strokeWidth="1" />
        ))}
      </svg>

      <div className="relative z-10 mx-auto w-full max-w-md">
        {/* Clean Editorial Header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <GoldCrest size={62} />
          <h1 className="mt-4 text-2xl font-bold tracking-[0.14em] text-[#E8C97A] uppercase">
            {mode === 'signin' ? 'Login' : mode === 'signup' ? 'Register Now' : 'Reset Password'}
          </h1>
          <p className="mt-1 text-[11px] tracking-[0.22em] text-[#C5A358]/75 uppercase">
            {APP_INFO.name} • {APP_INFO.tagline}
          </p>
        </div>

        {/* Pure Behance Floating Warm Champagne-Gold Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl bg-gradient-to-br from-[#E8C97A] via-[#DDB965] to-[#C9A452] p-7 text-[#111111] shadow-[0_24px_60px_-14px_rgba(232,201,122,0.35)]"
          >
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="mb-4 flex items-center gap-1.5 text-xs font-bold text-[#111111]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Login
              </button>
            )}

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#111111] p-3 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-[#111111] p-3 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Email or Mobile Number
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter email or +91 mobile"
                    autoComplete="username"
                    className="mt-1.5 w-full border-b border-[#111111]/30 bg-transparent py-2 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="mt-1.5 w-full border-b border-[#111111]/30 bg-transparent py-2 pr-9 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                      className="absolute right-1 top-3 text-[#111111]/70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-[#111111]/80">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#111111]"
                    />
                    Remember Me
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-xs font-bold text-[#111111] underline"
                  >
                    Don&apos;t have an account? Register
                  </button>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.94 }}
                    className="flex h-11 items-center gap-2 rounded-full bg-[#111111] px-5 text-xs font-bold tracking-wider text-[#E8C97A] uppercase shadow-lg disabled:opacity-50"
                  >
                    <span>
                      {loading ? (slowWakeMsg ? 'Waking...' : 'Signing In') : 'Proceed'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1 w-full border-b border-[#111111]/30 bg-transparent py-1.5 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full border-b border-[#111111]/30 bg-transparent py-1.5 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Mobile Number (+91)
                  </label>
                  <div className="flex items-center border-b border-[#111111]/30 focus-within:border-[#111111]">
                    <span className="pr-2 text-xs font-bold text-[#111111]/70">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9521014851"
                      className="w-full bg-transparent py-1.5 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, A-Z, a-z, 0-9, !@#$"
                      className="mt-1 w-full border-b border-[#111111]/30 bg-transparent py-1.5 pr-8 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-1 top-2 text-[#111111]/70"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password.length > 0 && (
                    <div className="mt-2 rounded-xl bg-[#111111]/90 p-2.5 text-[10px] text-zinc-300">
                      <div className="mb-1 flex justify-between font-bold">
                        <span>Strength</span>
                        <span className="text-[#E8C97A]">{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`h-1 rounded-full ${
                              strength.score >= i ? 'bg-[#E8C97A]' : 'bg-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]/70">
                    Confirm Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="mt-1 w-full border-b border-[#111111]/30 bg-transparent py-1.5 pr-8 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-1 top-2 text-[#111111]/70"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1 text-[11px] leading-snug text-[#111111]/85">
                  <input
                    type="checkbox"
                    checked={acceptedLegal}
                    onChange={(e) => setAcceptedLegal(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[#111111]"
                  />
                  <span>
                    I accept{' '}
                    <button type="button" onClick={() => onOpenDoc('terms')} className="font-bold underline">
                      Terms
                    </button>
                    ,{' '}
                    <button type="button" onClick={() => onOpenDoc('privacy')} className="font-bold underline">
                      Privacy
                    </button>{' '}
                    &amp;{' '}
                    <button type="button" onClick={() => onOpenDoc('cookies')} className="font-bold underline">
                      Cookies
                    </button>
                    .
                  </span>
                </label>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs font-bold underline"
                  >
                    Already registered? Login
                  </button>
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.94 }}
                    className="flex h-11 items-center gap-2 rounded-full bg-[#111111] px-5 text-xs font-bold tracking-wider text-[#E8C97A] uppercase shadow-lg disabled:opacity-50"
                  >
                    <span>
                      {loading ? (slowWakeMsg ? 'Waking...' : 'Creating') : 'Next'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <p className="text-xs font-medium text-[#111111]/80">
                  Enter your registered email address to request a password reset.
                </p>
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-b border-[#111111]/35 bg-transparent py-2 text-sm font-semibold text-[#111111] placeholder-[#111111]/45 focus:border-[#111111] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-[#111111] py-3 text-xs font-bold tracking-wider text-[#E8C97A] uppercase disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#C5A358]" />
          <span>TLS Encrypted • {APP_INFO.address}</span>
        </div>
      </div>
    </div>
  );
}
