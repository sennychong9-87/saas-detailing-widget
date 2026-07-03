'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AddShopPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const adminEmail = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ADMIN_EMAIL : null;

  const [session, setSession] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [baseSedan, setBaseSedan] = useState(150);
  const [baseSuv, setBaseSuv] = useState(200);
  const [baseTruck, setBaseTruck] = useState(250);
  const [weekendPricing, setWeekendPricing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login');
      setSession(session);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);

    const shopId = crypto.randomUUID();

    const { error: insertErr } = await supabase.from('shops').insert({
      id: shopId,
      business_name: businessName,
      owner_email: ownerEmail,
      base_sedan_price: Number(baseSedan),
      base_suv_price: Number(baseSuv),
      base_truck_price: Number(baseTruck),
      is_weekend_pricing_active: weekendPricing,
    });

    if (insertErr) {
      setError(insertErr.message);
      setSubmitting(false);
      return;
    }

    const defaults = [
      { shop_id: shopId, category: 'interior_condition', option_name: 'clean', price_adjustment: 0 },
      { shop_id: shopId, category: 'interior_condition', option_name: 'dirty', price_adjustment: 50 },
      { shop_id: shopId, category: 'interior_condition', option_name: 'disaster', price_adjustment: 120 },
      { shop_id: shopId, category: 'exterior_condition', option_name: 'clean', price_adjustment: 0 },
      { shop_id: shopId, category: 'exterior_condition', option_name: 'dirty', price_adjustment: 40 },
      { shop_id: shopId, category: 'exterior_condition', option_name: 'disaster', price_adjustment: 150 },
    ];

    await supabase.from('pricing_rules').insert(defaults);

    setResult({ id: shopId, businessName, ownerEmail });
    setBusinessName('');
    setOwnerEmail('');
    setSubmitting(false);
  }

  if (!session) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  if (adminEmail && session.user.email !== adminEmail) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
        <p className="text-red-400 font-medium">Access denied</p>
        <p className="text-slate-400 text-xs mt-2">Only the admin can add shops.</p>
        <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm text-blue-400 underline">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-wide">Add New Shop</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{session.user.email}</span>
          <button onClick={() => router.push('/dashboard')} className="text-xs text-blue-400 hover:text-blue-300 transition">Dashboard</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-3 bg-red-900/50 text-red-300 text-xs rounded-xl border border-red-800">{error}</div>
        )}

        {result ? (
          <div className="bg-slate-800 rounded-xl p-6 space-y-4">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center text-lg font-bold">✓</div>
            <h2 className="text-sm font-bold">Shop Created</h2>
            <div className="text-xs space-y-1 text-slate-300">
              <p><span className="text-slate-500">Name:</span> {result.businessName}</p>
              <p><span className="text-slate-500">Email:</span> {result.ownerEmail}</p>
              <p><span className="text-slate-500">Shop ID:</span> <span className="font-mono text-blue-300">{result.id}</span></p>
            </div>
            <p className="text-xs text-slate-400">The detailer can now sign up at <span className="font-mono text-blue-300">/login</span> with this email.</p>
            <button onClick={() => setResult(null)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition">
              Add Another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Business Name</label>
              <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required
                className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Owner Email</label>
              <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required
                className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Sedan</label>
                <input type="number" value={baseSedan} onChange={(e) => setBaseSedan(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">SUV</label>
                <input type="number" value={baseSuv} onChange={(e) => setBaseSuv(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Truck</label>
                <input type="number" value={baseTruck} onChange={(e) => setBaseTruck(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={weekendPricing} onChange={(e) => setWeekendPricing(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700" />
              <span className="text-sm">Enable 15% weekend surcharge</span>
            </label>
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl tracking-wider transition disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Shop'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
