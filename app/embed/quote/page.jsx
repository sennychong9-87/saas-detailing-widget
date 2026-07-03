'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function WidgetForm() {
  const searchParams = useSearchParams();
  const shopId = searchParams.get('shop_id') || '4a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d';

  const [shopConfig, setShopConfig] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [vehicleSize, setVehicleSize] = useState('sedan');
  const [interiorCondition, setInteriorCondition] = useState('clean');
  const [exteriorCondition, setExteriorCondition] = useState('clean');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    async function fetchShopData() {
      try {
        const [shopRes, rulesRes] = await Promise.all([
          supabase.from('shops').select('*').eq('id', shopId).single(),
          supabase.from('pricing_rules').select('*').eq('shop_id', shopId),
        ]);

        if (shopRes.error) {
          setFetchError(shopRes.error.message);
        } else if (shopRes.data) {
          setShopConfig(shopRes.data);
          setPricingRules(rulesRes.data || []);
        } else {
          setFetchError('Shop not found');
        }
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShopData();
  }, [shopId]);

  const priceCalculations = useMemo(() => {
    if (!shopConfig) return { total: 0, deposit: 0 };

    let base = shopConfig.base_sedan_price;
    if (vehicleSize === 'suv') base = shopConfig.base_suv_price;
    if (vehicleSize === 'truck') base = shopConfig.base_truck_price;

    const ruleLookup = (category, option) => {
      const rule = pricingRules.find(r => r.category === category && r.option_name === option);
      return rule ? Number(rule.price_adjustment) : 0;
    };

    let modifiers = 0;
    modifiers += ruleLookup('interior_condition', interiorCondition);
    modifiers += ruleLookup('exterior_condition', exteriorCondition);

    let subTotal = Number(base) + modifiers;

    if (shopConfig.is_weekend_pricing_active) {
      subTotal = subTotal * 1.15;
    }

    const depositRequired = subTotal * 0.20;

    return {
      total: Math.round(subTotal),
      deposit: Math.round(depositRequired)
    };
  }, [shopConfig, pricingRules, vehicleSize, interiorCondition, exteriorCondition]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !phone) return alert('All contact inputs are required.');
    setIsSubmitting(true);

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{ shop_id: shopId, full_name: fullName, email, phone }])
        .select()
        .single();

      if (customerError) throw customerError;

      const { error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          shop_id: shopId,
          customer_id: customerData.id,
          vehicle_size: vehicleSize,
          interior_condition: interiorCondition,
          exterior_condition: exteriorCondition,
          estimated_total_price: priceCalculations.total,
          deposit_required_amount: priceCalculations.deposit,
          status: 'pending'
        }]);

      if (quoteError) throw quoteError;
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Network transmission failed. Verify environment variable endpoints.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Initializing Data Parameters...</div>;
  if (!shopConfig) return (
    <div className="p-8 text-center">
      <p className="text-red-500 font-medium">Error: Shop configuration unavailable</p>
      {fetchError && <p className="text-xs text-slate-400 mt-2">{fetchError}</p>}
      <p className="text-xs text-slate-400 mt-2">Use <code className="bg-slate-100 px-1 rounded">?shop_id=YOUR_SHOP_UUID</code> in the URL</p>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-100 shadow-2xl rounded-2xl p-6 font-sans text-slate-800">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{shopConfig.business_name}</h2>
        <p className="text-xs text-slate-400 mt-0.5">Instant Visual Quote Generator</p>
      </div>

      {!isSuccess ? (
        <form onSubmit={handleBookingSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">1. Select Car Size</label>
            <div className="grid grid-cols-3 gap-2">
              {['sedan', 'suv', 'truck'].map((size) => (
                <button key={size} type="button" onClick={() => setVehicleSize(size)}
                  className={`py-2 px-1 text-xs capitalize font-semibold rounded-xl border transition-all duration-150 ${vehicleSize === size ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  {size === 'truck' ? 'Truck/Van' : size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">2. Interior Condition</label>
            <div className="grid grid-cols-3 gap-2">
              {['clean', 'dirty', 'disaster'].map((cond) => (
                <button key={cond} type="button" onClick={() => setInteriorCondition(cond)}
                  className={`py-2 px-1 text-xs capitalize font-semibold rounded-xl border transition-all duration-150 ${interiorCondition === cond ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">3. Exterior Condition</label>
            <div className="grid grid-cols-3 gap-2">
              {['clean', 'dirty', 'disaster'].map((cond) => (
                <button key={cond} type="button" onClick={() => setExteriorCondition(cond)}
                  className={`py-2 px-1 text-xs capitalize font-semibold rounded-xl border transition-all duration-150 ${exteriorCondition === cond ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  {cond}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Contact Information</label>
            <input type="text" placeholder="Your Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
            <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
            <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 mt-3 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Estimated Clean Total:</span>
              <span className="font-semibold text-slate-900">${priceCalculations.total}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-600 pt-1.5 border-t border-dashed border-slate-200">
              <span>20% Booking Secure Fee:</span>
              <span>${priceCalculations.deposit}</span>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl tracking-wider uppercase shadow-md transition disabled:opacity-50">
            {isSubmitting ? 'Logging Secure Lock...' : `Request Slot & Lock $${priceCalculations.deposit} Deposit`}
          </button>
        </form>
      ) : (
        <div className="text-center py-8 space-y-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-base font-bold">✓</div>
          <h3 className="text-sm font-bold text-slate-900">Registration Complete</h3>
          <p className="text-xs text-slate-500 px-4 leading-relaxed">
            Your 20% calculation parameter allocation of <span className="font-bold text-slate-800">${priceCalculations.deposit}</span> has been written safely to the cloud pipeline.
          </p>
        </div>
      )}
    </div>
  );
}

export default function QuoteWidgetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Client Node Container...</div>}>
      <WidgetForm />
    </Suspense>
  );
}