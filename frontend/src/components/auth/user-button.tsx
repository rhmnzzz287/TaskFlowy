'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { authClient, useSession } from '@/lib/auth-client';
import { useTranslation } from '@/lib/i18n/context';

function initials(nameOrEmail: string) {
  const base = nameOrEmail.trim();
  if (!base) return '?';
  const parts = base.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function UserButton() {
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (isPending) {
    return (
      <div className="w-8 h-8 rounded-full bg-surface-hi border border-border animate-pulse" aria-hidden />
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        className="text-xs px-3 py-1.5 rounded border border-border text-muted hover:text-text-primary hover:bg-surface-hi/50 font-medium transition-colors"
      >
        {t.auth.signInButton}
      </Link>
    );
  }

  const user = session.user;
  const label = user.name || user.email;

  async function handleSignOut() {
    await authClient.signOut();
    setOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full border border-border bg-surface-hi/40 hover:bg-surface-hi transition-colors"
        aria-label={label}
        title={label}
      >
        <span className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center">
          {initials(label)}
        </span>
        <ChevronDown size={12} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3.5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-text-primary truncate">{user.name || '—'}</p>
            <p className="text-[11px] text-muted truncate mt-0.5">{user.email}</p>
          </div>
          <div className="p-1.5 flex flex-col gap-0.5">
            <Link
              href="/app"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-text-dim hover:bg-surface-hi hover:text-text-primary transition-colors"
            >
              <LayoutDashboard size={13} />
              <span>{t.navbar.openWorkbench}</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left"
            >
              <LogOut size={13} />
              <span>{t.auth.signOut}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
