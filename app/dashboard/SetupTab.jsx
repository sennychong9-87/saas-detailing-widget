'use client';
import { useState, useEffect } from 'react';

const VEHICLE_SIZES = ['sedan', 'suv', 'truck'];
const CONDITIONS = ['clean', 'dirty', 'disaster'];

export default function SetupTab({ supabase, shop, setShop, pricingRules, setPricingRules, session, onShopUpdate }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(shop.payment_info || '');
  const [copied, setCopied] = useState(false);
  const [serviceType, setServiceType] = useState(shop.service_type || 'detailing');
  const [providesProtection, setProvidesProtection] = useState(shop.provides_protection || false);
  const [protectionServices, setProtectionServices] = useState([]);
  const [addonServices, setAddonServices] = useState([]);
  const [showProtectionSection, setShowProtectionSection] = useState(false);

  useEffect(() => { setPaymentInfo(shop.payment_info || ''); setServiceType(shop.service_type || 'detailing'); setProvidesProtection(shop.provides_protection || false); }, [shop]);

  useEffect(() => {
    supabase.from('protection_services').select('*').eq('shop_id', shop.id).then(({ data }) => { if (data) setProtectionServices(data); });
    supabase.from('addon_services').select('*').eq('shop_id', shop.id).then(({ data }) => { if (data) setAddonServices(data); });
  }, [shop.id]);

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

  function updateProtection(idx, field, value) {
    setProtectionServices(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function addProtectionRow() {
    setProtectionServices(prev => [...prev, { shop_id: shop.id, name: '', vehicle_size: 'sedan', price: 0, _new: true }]);
  }

  function removeProtection(idx) {
    setProtectionServices(prev => prev.filter((_, i) => i !== idx));
  }

  function updateAddon(idx, field, value) {
    setAddonServices(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  function addAddonRow() {
    setAddonServices(prev => [...prev, { shop_id: shop.id, name: '', price: 0, _new: true }]);
  }

  function removeAddon(idx) {
    setAddonServices(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const { error: shopErr } = await supabase
      .from('shops')
      .update({
        business_name: shop.business_name,
        base_sedan_price: Number(shop.base_sedan_price),
        base_suv_price: Number(shop.base_suv_price),
        base_truck_price: Number(shop.base_truck_price),
        is_weekend_pricing_active: shop.is_weekend_pricing_active,
        payment_info: paymentInfo,
        service_type: serviceType,
        provides_protection: providesProtection,
      })
      .eq('id', shop.id);

    if (shopErr) return alert('Failed to save: ' + shopErr.message);

    for (const rule of pricingRules) {
      if (rule.id) {
        await supabase.from('pricing_rules').update({ price_adjustment: Number(rule.price_adjustment) }).eq('id', rule.id);
      } else {
        await supabase.from('pricing_rules').insert({ shop_id: shop.id, category: rule.category, option_name: rule.option_name, price_adjustment: Number(rule.price_adjustment) });
      }
    }

    for (const ps of protectionServices) {
      if (ps._new) {
        const { data } = await supabase.from('protection_services').insert({ shop_id: shop.id, name: ps.name, vehicle_size: ps.vehicle_size, price: Number(ps.price) }).select().single();
        if (data) ps.id = data.id;
        delete ps._new;
      } else if (ps._deleted) {
        await supabase.from('protection_services').delete().eq('id', ps.id);
      } else {
        await supabase.from('protection_services').update({ name: ps.name, vehicle_size: ps.vehicle_size, price: Number(ps.price) }).eq('id', ps.id);
      }
    }

    for (const ad of addonServices) {
      if (ad._new) {
        const { data } = await supabase.from('addon_services').insert({ shop_id: shop.id, name: ad.name, price: Number(ad.price) }).select().single();
        if (data) ad.id = data.id;
        delete ad._new;
      } else if (ad._deleted) {
        await supabase.from('addon_services').delete().eq('id', ad.id);
      } else {
        await supabase.from('addon_services').update({ name: ad.name, price: Number(ad.price) }).eq('id', ad.id);
      }
    }

    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Name</h2>
        <input type="text" value={shop.business_name} onChange={(e) => updateShopField('business_name', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Service Type</h2>
        <p className="text-xs text-slate-400">What services do you offer?</p>
        <div className="flex gap-2">
          {['detailing', 'protection', 'both'].map(t => (
            <button key={t} onClick={() => { setServiceType(t); if (t === 'protection') setProvidesProtection(true); }}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition ${serviceType === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              {t === 'both' ? 'Both' : t}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Info</h2>
        <p className="text-xs text-slate-400">Share your UPI ID, payment link, or instructions for customers to pay the 20% deposit.</p>
        <input type="text" value={paymentInfo} onChange={(e) => setPaymentInfo(e.target.value)}
          placeholder="e.g. UPI: detailer@upi or https://razorpay.me/yourlink"
          className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500" />
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <button onClick={() => setShowProtectionSection(!showProtectionSection)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Paint Protection / Ceramic Coating</span>
          <span className="text-lg">{showProtectionSection ? '−' : '+'}</span>
        </button>
        {showProtectionSection && (
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={providesProtection} onChange={(e) => setProvidesProtection(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700" />
              <span className="text-sm">I offer paint protection / ceramic coating services</span>
            </label>
            {providesProtection && (
              <div className="space-y-2">
                {protectionServices.map((ps, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" placeholder="Service name" value={ps.name} onChange={(e) => updateProtection(idx, 'name', e.target.value)}
                      className="flex-1 px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded-lg" />
                    <select value={ps.vehicle_size} onChange={(e) => updateProtection(idx, 'vehicle_size', e.target.value)}
                      className="px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded-lg">
                      {VEHICLE_SIZES.map(s => <option key={s} value={s}>{s === 'truck' ? 'Truck/Van' : s}</option>)}
                    </select>
                    <input type="number" placeholder="Price" value={ps.price} onChange={(e) => updateProtection(idx, 'price', e.target.value)}
                      className="w-20 px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded-lg" />
                    <button onClick={() => removeProtection(idx)} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                  </div>
                ))}
                <button onClick={addProtectionRow} className="text-xs text-blue-400 hover:text-blue-300">+ Add protection service</button>
              </div>
            )}
          </div>
        )}
      </section>

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

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <button onClick={() => { const s = document.getElementById('addon-section'); s.style.display = s.style.display === 'none' ? 'block' : 'none'; }}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Add-on Services</span>
          <span className="text-lg" id="addon-toggle">+</span>
        </button>
        <div id="addon-section" style={{ display: 'none' }} className="space-y-2 pt-2 border-t border-slate-700">
          {addonServices.map((ad, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input type="text" placeholder="Service name" value={ad.name} onChange={(e) => updateAddon(idx, 'name', e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded-lg" />
              <input type="number" placeholder="Price" value={ad.price} onChange={(e) => updateAddon(idx, 'price', e.target.value)}
                className="w-20 px-2 py-1.5 text-xs bg-slate-700 border border-slate-600 rounded-lg" />
              <button onClick={() => removeAddon(idx)} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
            </div>
          ))}
          <button onClick={addAddonRow} className="text-xs text-blue-400 hover:text-blue-300">+ Add service</button>
        </div>
      </section>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl tracking-wider transition disabled:opacity-50">
        {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Settings'}
      </button>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Embed Widget</h2>
        <p className="text-xs text-slate-400">Copy this iframe code and paste it into your website to show the booking widget.</p>
        <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-300 font-mono break-all select-all border border-slate-700">
          {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/quote?shop_id=${shop.id}" width="100%" height="700" frameborder="0"></iframe>`}
        </div>
        <button onClick={() => { navigator.clipboard.writeText(`<iframe src="${window.location.origin}/embed/quote?shop_id=${shop.id}" width="100%" height="700" frameborder="0"></iframe>`); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition">
          {copied ? 'Copied!' : 'Copy Embed Code'}
        </button>
      </section>
    </div>
  );
}
