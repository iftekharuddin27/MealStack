// ============================================================
// MealStack · Sidebar Navigation Component
// ============================================================

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { getExpiryStatus } from '@/lib/expiryLogic';

const navItems = [
  {
    section: 'Kitchen',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="1" y="1" width="6" height="6" rx="1" />
            <rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
        ),
      },
      {
        label: 'Recipe Feed',
        href: '/recipes',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 3h12M2 8h12M2 13h8" />
            <circle cx="13" cy="12" r="2.5" />
            <path d="M13 9.5v2.5l1.5 1" />
          </svg>
        ),
      },
      {
        label: 'Inventory',
        href: '/inventory',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z" />
            <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Insights',
    items: [
      {
        label: 'Waste Analytics',
        href: '/analytics',
        icon: (
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 12l3-4 3 2 3-5 3 2" />
            <path d="M2 14h12" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: inventory = [] } = useInventory();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuMessage, setMenuMessage] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const fullName = data.user?.user_metadata?.full_name || 'User';
      setUserName(fullName);
      setEditName(fullName);
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setShowDropdown(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleSaveProfile() {
    const trimmed = editName.trim();
    if (!trimmed) {
      setMenuMessage('Display name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    setIsSavingProfile(false);

    if (error) {
      setMenuMessage(error.message);
      return;
    }

    setUserName(trimmed);
    setShowProfileModal(false);
    setShowDropdown(false);
    setMenuMessage('Profile updated successfully.');
    router.refresh();
  }

  function clearOfflineData() {
    const storageKeys = [
      'mealstack_inventory_by_user',
      'mealstack_cooked_by_user',
      'mealstack_inventory_sync_pending_by_user',
    ];

    for (const key of storageKeys) {
      localStorage.removeItem(key);
    }

    const cookieNames = document.cookie
      .split(';')
      .map((cookie) => cookie.trim().split('=')[0])
      .filter((name) => name.startsWith('mealstack_inv_') || name.startsWith('mealstack_cooked_'));

    for (const name of cookieNames) {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
    }

    setShowDropdown(false);
    setMenuMessage('Local fallback data cleared.');
    router.refresh();
  }

  function openProfileEditor() {
    setShowDropdown(false);
    setEditName(userName);
    setShowProfileModal(true);
  }

  const expiringCount = inventory.filter(
    (i) => getExpiryStatus(i.expires_at) === 'critical' || getExpiryStatus(i.expires_at) === 'warning'
  ).length;

  const navContent = (
    <nav className="flex-1 py-3 overflow-y-auto">
      {navItems.map((group) => (
        <div key={group.section} className="mb-2">
          <div className="px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-subtle">
            {group.section}
          </div>
          {group.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium border-l-2 transition-all ${
                  active
                    ? 'text-accent bg-green-950/40 border-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface border-transparent'
                }`}
              >
                <span className={active ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
                {item.label}
                {item.label === 'Dashboard' && expiringCount > 0 && (
                  <span className="ml-auto font-mono text-[9px] bg-red-950 text-red-400 border border-red-800/50 px-1.5 py-0.5 rounded-full">
                    {expiringCount} exp
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footerContent = (
    <div className="px-5 py-4 border-t border-border relative">
      {menuMessage && (
        <p className="mb-2 font-mono text-[10px] text-subtle bg-background-3 border border-border rounded px-2 py-1">
          {menuMessage}
        </p>
      )}

      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2.5 w-full text-left hover:bg-surface p-2 -mx-2 rounded-lg transition"
      >
        <div className="w-8 h-8 rounded-full bg-green-950 border border-green-900 flex items-center justify-center font-mono text-xs text-green-400 font-semibold uppercase">
          {userName.substring(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate">{userName}</div>
          <div className="font-mono text-[10px] text-subtle">MealStack User</div>
        </div>
      </button>

      {showDropdown && (
        <div className="absolute bottom-full left-5 right-5 mb-2 bg-background-3 border border-border rounded-lg shadow-xl overflow-hidden z-50">
          <button
            onClick={openProfileEditor}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface transition"
          >
            Edit profile
          </button>
          <button
            onClick={() => {
              setShowDropdown(false);
              router.push('/inventory');
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface transition"
          >
            Go to inventory
          </button>
          <button
            onClick={() => {
              setShowDropdown(false);
              router.push('/analytics');
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-surface transition"
          >
            View analytics
          </button>
          <button
            onClick={clearOfflineData}
            className="w-full text-left px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-950/20 transition"
          >
            Clear local backup data
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-background-2 px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background-3 px-3 py-1.5 text-xs font-mono text-foreground"
        >
          <span>{mobileOpen ? 'Close' : 'Menu'}</span>
        </button>
        <div className="font-head text-lg text-accent leading-none">
          Meal<span className="text-subtle italic">Stack</span>
        </div>
        <div className="w-10" />
      </div>

      <aside className="hidden md:flex w-56 flex-shrink-0 bg-background-2 border-r border-border flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-border">
          <div className="font-head text-[22px] text-accent leading-none">
            Meal<span className="text-subtle italic">Stack</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-subtle mt-1">
            Zero-Waste Kitchen Engine
          </div>
        </div>
        {navContent}
        {footerContent}
      </aside>

      <div className={`fixed inset-0 z-30 md:hidden transition ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-background-2 border-r border-border flex flex-col transition-transform ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-5 py-5 border-b border-border">
            <div className="font-head text-[22px] text-accent leading-none">
              Meal<span className="text-subtle italic">Stack</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-subtle mt-1">
              Zero-Waste Kitchen Engine
            </div>
          </div>
          {navContent}
          {footerContent}
        </aside>
      </div>

      {showProfileModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setShowProfileModal(false)}
        >
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-head text-xl mb-1">Edit profile</h3>
            <p className="font-mono text-xs text-subtle mb-4">Update how your name appears in the app.</p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-subtle block mb-1">
                  Display name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-background-3 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-widest text-subtle block mb-1">
                  Email
                </label>
                <input
                  value={userEmail}
                  readOnly
                  className="w-full bg-background-3 border border-border rounded-lg px-3 py-2 text-sm text-subtle"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-2.5 bg-transparent border border-border text-muted-foreground rounded-lg text-sm hover:border-border-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-background font-bold text-sm rounded-lg transition disabled:opacity-60"
              >
                {isSavingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
