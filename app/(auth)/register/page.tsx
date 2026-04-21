// ============================================================
// MealStack · Register Page
// ============================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { full_name: name },
        emailRedirectTo: `${location.origin}/`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Check your email to confirm your account, then sign in.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-head text-4xl text-accent">
            Meal<span className="text-subtle italic">Stack</span>
          </div>
          <p className="mt-2 font-mono text-xs text-subtle">Zero-Waste Kitchen Engine</p>
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-head text-xl">Create account</h2>
            <p className="text-xs text-subtle mt-1">start saving food (and money)</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-subtle">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-background-3 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-subtle">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                minLength={8}
                required
                className="w-full bg-background-3 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-xs text-green-400 font-mono bg-green-950/50 border border-green-900 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-background font-bold text-sm rounded-lg py-2.5 transition disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-xs text-subtle">
            Already have an account?{' '}
            <a href="/login" className="text-accent hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
