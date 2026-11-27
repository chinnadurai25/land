import React, { useState } from 'react';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AccessibleModal } from './AccessibleModal';

export function AuthModal() {
  const { authModalOpen, authModalNotice, closeAuthModal, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        setPassword('');
      } else {
        const res = await register({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        });
        setPassword('');
        if (res.pendingApproval) {
          setSuccessMsg(res.message);
          setFullName('');
          setPhone('');
          setMode('login');
        }
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Unable to complete authentication. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      open={authModalOpen}
      onClose={closeAuthModal}
      title={mode === 'login' ? 'Sign in to Landnest' : 'Create your Landnest account'}
      subtitle="Save properties, manage your listings, and track review status."
      maxWidthClass="max-w-lg"
      fullScreenMobile={false}
    >
      <div className="space-y-5">
        {authModalNotice && (
          <div className="rounded-2xl border border-[#D3DDD0] bg-[#EEF1E8] px-4 py-3 text-[14px] font-medium text-[#1F3229]">
            {authModalNotice}
          </div>
        )}

        {/* Mode Switch */}
        <div className="grid grid-cols-2 rounded-full bg-[#EEF1E8] p-1 border border-[#D3DDD0]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`min-h-[44px] rounded-full text-[16px] font-bold transition ${
              mode === 'login' ? 'bg-[#245B45] text-white' : 'text-[#1F3229]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`min-h-[44px] rounded-full text-[16px] font-bold transition ${
              mode === 'register' ? 'bg-[#245B45] text-white' : 'text-[#1F3229]'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block mb-1.5 text-[14px] font-bold text-[#1F3229]"
                >
                  Full Name*
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Karthik Sundaram"
                    className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white pl-12 pr-4 text-[16px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-phone"
                  className="block mb-1.5 text-[14px] font-bold text-[#1F3229]"
                >
                  Phone Number*
                </label>
                <div className="relative">
                  <Phone
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98421 00000"
                    className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white pl-12 pr-4 text-[16px]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block mb-1.5 text-[14px] font-bold text-[#1F3229]"
            >
              Email Address*
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                aria-hidden="true"
              />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white pl-12 pr-4 text-[16px]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block mb-1.5 text-[14px] font-bold text-[#1F3229]"
            >
              Password*
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#245B45]"
                aria-hidden="true"
              />
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Min 8 chars, letter + number' : 'Your password'}
                className="min-h-[52px] w-full rounded-2xl border border-[#D3DDD0] bg-white pl-12 pr-4 text-[16px]"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#D8B490] bg-[#FDF3E7] px-4 py-3 text-[14px] font-bold text-[#8A4A18]"
            >
              {error}
            </p>
          )}

          {successMsg && (
            <p
              role="status"
              className="rounded-xl border border-[#245B45] bg-[#EEF1E8] px-4 py-3 text-[14px] font-bold text-[#1F3229]"
            >
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[54px] w-full items-center justify-center rounded-full bg-[#245B45] px-6 py-3 text-[16px] sm:text-[17px] font-bold text-white transition hover:bg-[#173E2F] disabled:opacity-60"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Sign In'
              : 'Create Account'}
          </button>
        </form>
      </div>
    </AccessibleModal>
  );
}
