import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
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
  const label =
    score <= 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong';
  const color =
    score <= 2
      ? 'bg-red-500'
      : score === 3
      ? 'bg-amber-500'
      : score === 4
      ? 'bg-sky-400'
      : 'bg-emerald-500';
  return { checks, score, label, color, valid: score === 5 };
}

export default function AuthScreens({ onAuthenticated, onOpenDoc }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sign In state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Sign Up state
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
    setError('');
    if (!identifier.trim() || !password) {
      setError('Please enter your email or mobile number and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login({ identifier, password });
      const token = res.token || res.accessToken || res.data?.token;
      const user = res.user || res.data?.user || { email: identifier.trim() };
      if (!token) throw new Error('Authentication token missing from server response.');

      authStorage.saveSession(token, user, rememberMe);
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
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
      setError('Password must meet all 5 security requirements below.');
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
    try {
      const formattedPhone = cleanPhone.startsWith('91') && cleanPhone.length === 12
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
        authStorage.saveSession(token, user, true);
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
        setError(`Self-service password reset is not enabled yet. Contact New Monika Jewellers at ${APP_INFO.contactPhone}.`);
      } else {
        setError(err.message || 'Unable to process reset request right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111] px-5 py-8 flex flex-col justify-center safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <GoldCrest size={56} />
          <h1 className="mt-3 text-xl font-bold tracking-[0.14em] text-[#E5C99B] uppercase">
            {APP_INFO.name}
          </h1>
          <p className="mt-0.5 text-[11px] tracking-widest text-zinc-400 uppercase">
            {APP_INFO.tagline}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-white/10 bg-[#171717] p-5 shadow-2xl">
          {mode !== 'forgot' ? (
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-[#111111] p-1 border border-white/5">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`rounded-lg py-2 text-xs font-semibold tracking-wide transition ${
                  mode === 'signin'
                    ? 'bg-[#B59A6C] text-[#111111]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`rounded-lg py-2 text-xs font-semibold tracking-wide transition ${
                  mode === 'signup'
                    ? 'bg-[#B59A6C] text-[#111111]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                SIGN UP
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="mb-4 flex items-center gap-1.5 text-xs font-medium text-[#B59A6C]"
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
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
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
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-300">
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
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
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

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-zinc-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[#111111] accent-[#B59A6C]"
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="font-medium text-[#B59A6C] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#B59A6C] py-3 text-sm font-bold tracking-wide text-[#111111] transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In to Live Terminals'}
              </button>
            </form>
          )}

          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Mobile Number (+91)
                </label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 h-4 w-4 text-zinc-500" />
                  <span className="absolute left-10 text-xs font-semibold text-zinc-400">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9521014851"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-18 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Real-time password strength meter */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Password strength</span>
                      <span className="font-semibold text-zinc-200">{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full ${
                            strength.score >= i ? strength.color : 'bg-zinc-800'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-zinc-400">
                      <span className={strength.checks.length ? 'text-emerald-400' : ''}>
                        • Min 8 characters
                      </span>
                      <span className={strength.checks.upper ? 'text-emerald-400' : ''}>
                        • 1 Uppercase (A-Z)
                      </span>
                      <span className={strength.checks.lower ? 'text-emerald-400' : ''}>
                        • 1 Lowercase (a-z)
                      </span>
                      <span className={strength.checks.number ? 'text-emerald-400' : ''}>
                        • 1 Number (0-9)
                      </span>
                      <span className={strength.checks.special ? 'text-emerald-400' : ''}>
                        • 1 Special char (!@#$)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
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

              <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed text-zinc-300">
                <input
                  type="checkbox"
                  checked={acceptedLegal}
                  onChange={(e) => setAcceptedLegal(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-[#111111] accent-[#B59A6C]"
                />
                <span>
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={() => onOpenDoc('terms')}
                    className="text-[#E5C99B] underline"
                  >
                    Terms &amp; Conditions
                  </button>
                  ,{' '}
                  <button
                    type="button"
                    onClick={() => onOpenDoc('privacy')}
                    className="text-[#E5C99B] underline"
                  >
                    Privacy Policy
                  </button>
                  , and{' '}
                  <button
                    type="button"
                    onClick={() => onOpenDoc('cookies')}
                    className="text-[#E5C99B] underline"
                  >
                    Cookie &amp; Storage Notice
                  </button>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#B59A6C] py-3 text-sm font-bold tracking-wide text-[#111111] transition active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Secure Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Reset Password</h2>
                <p className="mt-1 text-xs text-zinc-400">
                  Enter your registered email address to receive password reset instructions.
                </p>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#111111] py-2.5 pl-10 pr-3.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-[#B59A6C] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#B59A6C] py-3 text-sm font-bold text-[#111111] disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        {/* Security footer */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-[#B59A6C]" />
          <span>TLS Encrypted • {APP_INFO.address}</span>
        </div>
      </div>
    </div>
  );
}
