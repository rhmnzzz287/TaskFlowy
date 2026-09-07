'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Logo } from '@/components/ui/logo';
import { useTranslation } from '@/lib/i18n/context';

export function AuthForm({ mode, expired = false }: { mode: 'sign-in' | 'sign-up'; expired?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'sign-up';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password,
          callbackURL: '/app',
        });
        if (error) throw new Error(error.message || t.auth.signUpFailed);
      } else {
        const { error } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: '/app',
          rememberMe: true,
        });
        if (error) throw new Error(error.message || t.auth.signInFailed);
      }
      router.push('/app');
      router.refresh();
    } catch (err) {
      // Network/DNS failure surfaces as TypeError — say so plainly instead
      // of blaming the user's credentials.
      if (err instanceof TypeError) {
        setError('Cannot reach the server. Check your connection and try again.');
      } else {
        setError(err instanceof Error ? err.message : t.auth.genericError);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-text-primary flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} wordmarkClassName="text-lg" />
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-xl p-6">
          <h1 className="text-lg font-bold text-center">
            {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
          </h1>
          <p className="text-xs text-muted text-center mt-1 mb-5">
            {isSignUp ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
          </p>

          {expired && !error && mode === 'sign-in' && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded-lg text-xs bg-warning/10 text-warning border border-warning/20">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>Your session expired. Please sign in again — your local drafts are safe.</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-2.5 mb-4 rounded-lg text-xs bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {isSignUp && (
              <label className="block">
                <span className="label">{t.auth.nameLabel}</span>
                <div className="relative mt-1">
                  <UserIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.auth.namePlaceholder}
                    autoComplete="name"
                    className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-surface-hi/40 border border-border text-sm focus:outline-none focus:border-primary placeholder:text-muted"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="label">{t.auth.emailLabel}</span>
              <div className="relative mt-1">
                <Mail size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-surface-hi/40 border border-border text-sm focus:outline-none focus:border-primary placeholder:text-muted"
                />
              </div>
            </label>

            <label className="block">
              <span className="label">{t.auth.passwordLabel}</span>
              <div className="relative mt-1">
                <Lock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignUp ? t.auth.passwordPlaceholderSignUp : t.auth.passwordPlaceholder}
                  required
                  minLength={8}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  className="w-full pl-8 pr-2.5 py-2 rounded-lg bg-surface-hi/40 border border-border text-sm focus:outline-none focus:border-primary placeholder:text-muted"
                />
              </div>
            </label>

            <button type="submit" disabled={loading} className="btn-primary justify-center w-full py-2 mt-1 disabled:opacity-60">
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>{isSignUp ? t.auth.signUpButton : t.auth.signInButton}</span>
            </button>
          </form>

          <p className="text-xs text-muted text-center mt-4">
            {isSignUp ? (
              <>
                {t.auth.haveAccount}{' '}
                <Link href="/sign-in" className="text-primary font-semibold hover:underline">
                  {t.auth.signInLink}
                </Link>
              </>
            ) : (
              <>
                {t.auth.noAccount}{' '}
                <Link href="/sign-up" className="text-primary font-semibold hover:underline">
                  {t.auth.signUpLink}
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="text-[11px] text-muted text-center mt-4">
          <Link href="/" className="hover:text-text-primary hover:underline">
            ← {t.auth.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}
