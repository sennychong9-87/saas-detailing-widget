'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('login');
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setError(error.message);
      router.push('/dashboard');
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setError(error.message);
      setError('Account created. You can now log in.');
      setMode('login');
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
        <h1 className="text-lg font-bold text-slate-900 text-center mb-6">
          {mode === 'login' ? 'Shop Owner Login' : 'Create Account'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl tracking-wider transition">
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-4">
          {mode === 'login' ? (
            <>No account? <button onClick={() => { setMode('signup'); setError(null); }} className="text-blue-600 underline">Sign up</button></>
          ) : (
            <>Have an account? <button onClick={() => { setMode('login'); setError(null); }} className="text-blue-600 underline">Log in</button></>
          )}
        </p>
      </div>
    </div>
  );
}
