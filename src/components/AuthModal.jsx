import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, Phone, User, X } from 'lucide-react';
import { useAuth } from './AuthProvider';

const initialForm = {
  name: '',
  mobileNumber: '',
  email: '',
  password: '',
};

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'signin',
  title = 'Sign in to continue',
  subtitle = 'Create an account or sign in before sharing your itinerary.',
  onSuccess,
}) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setForm(initialForm);
    setError('');
    setIsSubmitting(false);
    setShowPassword(false);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (mode === 'signup' && !form.name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (mode === 'signup' && !form.mobileNumber.trim()) {
      setError('Please enter your mobile number.');
      return;
    }

    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (form.password.trim().length < 6) {
      setError('Password should be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      const action = mode === 'signup' ? signUp : signIn;
      const user = await action({
        name: form.name.trim(),
        mobileNumber: form.mobileNumber.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      await onSuccess?.(user);
      onClose?.();
    } catch (submitError) {
      console.error('Auth failed', submitError);
      setError(submitError.message || 'Could not complete authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] overflow-y-auto bg-[#0b1120]/72 backdrop-blur-sm flex items-end justify-center px-4 py-4 sm:py-6">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="hide-scrollbar relative my-auto max-h-[calc(100vh-24px)] w-full max-w-[420px] overflow-y-auto rounded-[28px] border border-[#edf1f5] bg-white p-4 shadow-2xl sm:max-h-[calc(100vh-48px)] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
          <div className="min-w-0">
            <p className="text-[20px] font-black text-[#1a1a2e]">{title}</p>
            <p className="text-[12px] text-[#64748b] font-medium mt-1 leading-relaxed">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-[14px] bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center text-[#64748b]"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2 rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] p-1 sm:mb-4">
          <button
            onClick={() => setMode('signin')}
            className={`h-[42px] rounded-[14px] text-[13px] font-black transition-all ${
              mode === 'signin' ? 'bg-white text-[#ff7a18] shadow-sm' : 'text-[#64748b]'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`h-[42px] rounded-[14px] text-[13px] font-black transition-all ${
              mode === 'signup' ? 'bg-white text-[#ff7a18] shadow-sm' : 'text-[#64748b]'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="flex flex-col gap-2.5 sm:gap-3">
          {mode === 'signup' && (
            <>
              <div className="rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 sm:py-3">
                <label className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] flex items-center gap-1.5 mb-2">
                  <User className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.4} />
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent outline-none text-[14px] font-semibold text-[#1a1a2e] placeholder:text-[#94a3b8]"
                />
              </div>

              <div className="rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 sm:py-3">
                <label className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] flex items-center gap-1.5 mb-2">
                  <Phone className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.4} />
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={form.mobileNumber}
                  onChange={(event) => updateField('mobileNumber', event.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-transparent outline-none text-[14px] font-semibold text-[#1a1a2e] placeholder:text-[#94a3b8]"
                />
              </div>
            </>
          )}

          <div className="rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 sm:py-3">
            <label className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] flex items-center gap-1.5 mb-2">
              <Mail className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.4} />
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
              className="w-full bg-transparent outline-none text-[14px] font-semibold text-[#1a1a2e] placeholder:text-[#94a3b8]"
            />
          </div>

          <div className="rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-2.5 sm:py-3">
            <label className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] flex items-center gap-1.5 mb-2">
              <LockKeyhole className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.4} />
              Password
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full bg-transparent outline-none text-[14px] font-semibold text-[#1a1a2e] placeholder:text-[#94a3b8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="shrink-0 rounded-full bg-white border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-black text-[#64748b] inline-flex items-center gap-1.5"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" strokeWidth={2.4} />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" strokeWidth={2.4} />
                    Show
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-[16px] border border-[#ffe0c9] bg-[#fff8f1] px-4 py-3">
            <p className="text-[12px] font-bold text-[#ff7a18] text-center">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="mt-4 h-[50px] w-full rounded-[18px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-[14px] font-extrabold text-white shadow-[0_8px_20px_rgba(255,122,24,0.28)] disabled:opacity-70 sm:mt-5 sm:h-[52px]"
        >
          {isSubmitting ? 'Please wait...' : mode === 'signup' ? 'Create account and continue' : 'Sign in and continue'}
        </button>
      </div>
    </div>
  );
}
