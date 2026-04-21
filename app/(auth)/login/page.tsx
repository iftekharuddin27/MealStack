// ============================================================
// MealStack · Login Page
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-head text-4xl text-accent">
            Meal<span className="text-subtle italic">Stack</span>
          </div>
          <p className="mt-2 font-mono text-xs text-subtle">Zero-Waste Kitchen Engine</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-head text-xl">Sign in</h2>
            <p className="text-xs text-subtle mt-1">to your kitchen dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-subtle">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-background-3 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-subtle">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-background-3 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-background font-bold text-sm rounded-lg py-2.5 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-xs text-subtle">
            No account?{' '}
            <a href="/register" className="text-accent hover:underline">
              Create one free
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
