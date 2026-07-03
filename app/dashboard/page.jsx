'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const VEHICLE_SIZES = ['sedan', 'suv', 'truck'];
const CONDITIONS = ['clean', 'dirty', 'disaster'];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [session, setSession] = useState(null);
  const [shop, setShop] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login');
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  async function loadData() {
    const email = session.user.email;

    const { data: owner } = await supabase
      .from('shop_owners')
      .select('shop_id')
      .eq('email', email)
      .single();

    if (!owner) {
      setLoading(false);
      return;
    }

    const [shopRes, rulesRes] = await Promise.all([
      supabase.from('shops').select('*').eq('id', owner.shop_id).single(),
      supabase.from('pricing_rules').select('*').eq('shop_id', owner.shop_id),
    ]);

    setShop(shopRes.data);
    setPricingRules(rulesRes.data || []);
    setLoading(false);
  }

  function getRule(category, optionName) {
    return pricingRules.find(r => r.category === category && r.option_name === optionName) || { price_adjustment: 0 };
  }

  function updateShopField(field, value) {
    setShop(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function updateRule(category, optionName, value) {
    setPricingRules(prev => {
      const idx = prev.findIndex(r => r.category === category && r.option_name === optionName);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], price_adjustment: Number(value) };
        return updated;
      }
      return [...prev, { shop_id: shop.id, category, option_name: optionName, price_adjustment: Number(value) }];
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const { error: shopErr } = await supabase
      .from('shops')
      .update({
        base_sedan_price: Number(shop.base_sedan_price),
        base_suv_price: Number(shop.base_suv_price),
        base_truck_price: Number(shop.base_truck_price),
        is_weekend_pricing_active: shop.is_weekend_pricing_active,
      })
      .eq('id', shop.id);

    if (shopErr) return alert('Failed to save shop prices: ' + shopErr.message);

    for (const rule of pricingRules) {
      if (rule.id) {
        await supabase.from('pricing_rules').update({ price_adjustment: Number(rule.price_adjustment) }).eq('id', rule.id);
      } else {
        await supabase.from('pricing_rules').insert({
          shop_id: shop.id,
          category: rule.category,
          option_name: rule.option_name,
          price_adjustment: Number(rule.price_adjustment),
        });
      }
    }

    setSaving(false);
    setSaved(true);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  if (!shop) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-red-400 font-medium">No shop linked to this account</p>
      <p className="text-slate-400 text-xs mt-2">Contact admin to link your email to a shop.</p>
      <button onClick={handleSignOut} className="mt-4 text-sm text-blue-400 underline">Sign out</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-wide">{shop.business_name} — Pricing</h1>
        <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-white transition">Sign out</button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle Base Prices</h2>
          <div className="grid grid-cols-3 gap-3">
            {VEHICLE_SIZES.map(size => (
              <div key={size}>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">{size === 'truck' ? 'Truck/Van' : size}</label>
                <input type="number" value={shop[`base_${size}_price`]} onChange={(e) => updateShopField(`base_${size}_price`, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interior Condition Modifiers</h2>
          <div className="grid grid-cols-3 gap-3">
            {CONDITIONS.map(cond => (
              <div key={cond}>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">{cond}</label>
                <input type="number" value={getRule('interior_condition', cond).price_adjustment} onChange={(e) => updateRule('interior_condition', cond, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Exterior Condition Modifiers</h2>
          <div className="grid grid-cols-3 gap-3">
            {CONDITIONS.map(cond => (
              <div key={cond}>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">{cond}</label>
                <input type="number" value={getRule('exterior_condition', cond).price_adjustment} onChange={(e) => updateRule('exterior_condition', cond, e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekend Pricing</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={shop.is_weekend_pricing_active} onChange={(e) => updateShopField('is_weekend_pricing_active', e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700" />
            <span className="text-sm">Apply 15% surcharge on weekends</span>
          </label>
        </section>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl tracking-wider transition disabled:opacity-50">
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Pricing'}
        </button>
      </main>
    </div>
  );
}
