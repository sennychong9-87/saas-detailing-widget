'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function generateBookingId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'DW-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function PaymentForm({ bookingId, amount, clientSecret, onComplete }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
    } else {
      onComplete();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={!stripe || processing}
        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl tracking-wider uppercase shadow-md transition disabled:opacity-50">
        {processing ? 'Processing...' : `Pay $${amount} Deposit Now`}
      </button>
    </form>
  );
}

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
  const [bookingState, setBookingState] = useState('form'); // form | created | confirmed
  const [bookingId, setBookingId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [bookingError, setBookingError] = useState(null);

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
    setBookingError(null);

    const newBookingId = generateBookingId();

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
          booking_id: newBookingId,
          vehicle_size: vehicleSize,
          interior_condition: interiorCondition,
          exterior_condition: exteriorCondition,
          estimated_total_price: priceCalculations.total,
          deposit_required_amount: priceCalculations.deposit,
          status: 'pending',
          payment_status: 'pending',
        }]);

      if (quoteError) throw quoteError;

      setBookingId(newBookingId);

      if (stripePromise && shopConfig?.stripe_account_id) {
        const res = await fetch('/api/stripe/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: priceCalculations.deposit,
            shopId,
            bookingId: newBookingId,
          }),
        });

        const data = await res.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        }
      }

      setBookingState('created');
    } catch (err) {
      console.error(err);
      setBookingError('Network transmission failed. Verify environment variable endpoints.');
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

  if (bookingState === 'confirmed') {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-100 shadow-2xl rounded-2xl p-6 font-sans text-slate-800">
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
          <h3 className="text-sm font-bold text-slate-900">Booking Confirmed</h3>
          <p className="text-xs text-slate-500 px-4 leading-relaxed">
            Your booking ID: <span className="font-mono font-bold text-slate-800 text-base block mt-1">{bookingId}</span>
          </p>
          <p className="text-xs text-slate-400">Present this ID on the day of your appointment.</p>
        </div>
      </div>
    );
  }

  if (bookingState === 'created') {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-100 shadow-2xl rounded-2xl p-6 font-sans text-slate-800">
        <div className="text-center mb-4">
          <h3 className="text-sm font-bold text-slate-900">Booking Created</h3>
          <p className="text-xs text-slate-500 mt-1">Your booking ID:</p>
          <p className="text-lg font-mono font-bold text-blue-700 tracking-wider mt-1">{bookingId}</p>
          <p className="text-xs text-slate-400 mt-1">Save this ID — you'll need it for your appointment.</p>
        </div>

        <p className="text-xs text-slate-400 text-center mb-3">Estimated total: ${priceCalculations.total} (20% deposit: ${priceCalculations.deposit}). Payment to be collected by the shop.</p>

        {clientSecret && stripePromise ? (
          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Pay deposit now</p>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                bookingId={bookingId}
                amount={priceCalculations.deposit}
                clientSecret={clientSecret}
                onComplete={() => {
                  supabase.from('quotes').update({ payment_status: 'paid', status: 'confirmed' }).eq('booking_id', bookingId).then();
                  setBookingState('confirmed');
                }}
              />
            </Elements>
          </div>
        ) : (
          <button onClick={() => setBookingState('confirmed')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl tracking-wider uppercase transition">
            Done — I'll pay at the shop
          </button>
        )}

        {bookingError && <p className="text-xs text-red-500 text-center mt-2">{bookingError}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-100 shadow-2xl rounded-2xl p-6 font-sans text-slate-800">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{shopConfig.business_name}</h2>
        <p className="text-xs text-slate-400 mt-0.5">Instant Visual Quote Generator</p>
      </div>

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

        {bookingError && <p className="text-xs text-red-500 text-center">{bookingError}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl tracking-wider uppercase shadow-md transition disabled:opacity-50">
          {isSubmitting ? 'Logging Secure Lock...' : `Request Slot & Lock $${priceCalculations.deposit} Deposit`}
        </button>
      </form>
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
