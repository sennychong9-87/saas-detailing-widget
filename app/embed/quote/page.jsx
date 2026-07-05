'use client';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
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
    const { error: confirmError } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (confirmError) { setError(confirmError.message); setProcessing(false); }
    else onComplete();
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
  const [protectionServices, setProtectionServices] = useState([]);
  const [addonServices, setAddonServices] = useState([]);
  const [scheduleSettings, setScheduleSettings] = useState(null);
  const [jobTimeEstimates, setJobTimeEstimates] = useState({});
  const [existingBookings, setExistingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [vehicleSize, setVehicleSize] = useState('sedan');
  const [interiorCondition, setInteriorCondition] = useState('clean');
  const [exteriorCondition, setExteriorCondition] = useState('clean');
  const [serviceType, setServiceType] = useState('detailing');
  const [selectedProtection, setSelectedProtection] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [showAddons, setShowAddons] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingState, setBookingState] = useState('form');
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

        if (shopRes.error) { setFetchError(shopRes.error.message); return; }
        if (!shopRes.data) { setFetchError('Shop not found'); return; }

        const shop = shopRes.data;
        setShopConfig(shop);
        setPricingRules(rulesRes.data || []);
        setServiceType(shop.service_type || 'detailing');

        const [protRes, addonRes, schedRes, timeRes, bookingRes] = await Promise.all([
          supabase.from('protection_services').select('*').eq('shop_id', shopId),
          supabase.from('addon_services').select('*').eq('shop_id', shopId),
          supabase.from('schedule_settings').select('*').eq('shop_id', shopId).single(),
          supabase.from('job_time_estimates').select('*').eq('shop_id', shopId),
          supabase.from('quotes').select('booking_id, appointment_date, appointment_time').eq('shop_id', shopId),
        ]);

        if (protRes.data) setProtectionServices(protRes.data);
        if (addonRes.data) setAddonServices(addonRes.data);
        if (schedRes.data) setScheduleSettings(schedRes.data);
        if (timeRes.data) {
          const map = {};
          timeRes.data.forEach(t => { map[`${t.vehicle_size}-${t.interior_condition}-${t.exterior_condition}`] = t.estimated_minutes; });
          setJobTimeEstimates(map);
        }
        if (bookingRes.data) setExistingBookings(bookingRes.data);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchShopData();
  }, [shopId]);

  const jobDuration = useMemo(() => {
    if (serviceType === 'protection') return 60;
    return jobTimeEstimates[`${vehicleSize}-${interiorCondition}-${exteriorCondition}`] || 60;
  }, [jobTimeEstimates, vehicleSize, interiorCondition, exteriorCondition, serviceType]);

  const calculateSlots = useCallback((date) => {
    if (!scheduleSettings || !date) return [];
    const dayOfWeek = new Date(date).getDay();
    if (!(scheduleSettings.working_days || []).includes(dayOfWeek)) return [];

    const [startH, startM] = (scheduleSettings.work_start || '09:00').split(':').map(Number);
    const [endH, endM] = (scheduleSettings.work_end || '17:00').split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const bookedSlots = existingBookings
      .filter(b => b.appointment_date === date && b.appointment_time)
      .map(b => {
        const [h, m] = b.appointment_time.split(':').map(Number);
        return h * 60 + m;
      });

    const bays = scheduleSettings.bays || 1;
    const slotDuration = jobDuration;

    const slots = [];
    for (let t = startMinutes; t + slotDuration <= endMinutes; t += 30) {
      const concurrent = bookedSlots.filter(bt => bt < t + slotDuration && bt + slotDuration > t).length;
      if (concurrent < bays) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return slots;
  }, [scheduleSettings, existingBookings, jobDuration]);

  useEffect(() => {
    if (!appointmentDate) { setAvailableSlots([]); setAppointmentTime(''); return; }
    const slots = calculateSlots(appointmentDate);
    setAvailableSlots(slots);
    if (!slots.includes(appointmentTime)) setAppointmentTime('');
  }, [appointmentDate, calculateSlots]);

  const priceCalculations = useMemo(() => {
    if (!shopConfig) return { total: 0, deposit: 0, breakdown: [] };
    const breakdown = [];

    if (serviceType === 'detailing' || serviceType === 'both') {
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
      if (shopConfig.is_weekend_pricing_active) subTotal = subTotal * 1.15;

      breakdown.push({ label: `Detailing (${vehicleSize})`, amount: Math.round(subTotal) });
    }

    if ((serviceType === 'protection' || serviceType === 'both') && selectedProtection) {
      const prot = protectionServices.find(p => p.id === selectedProtection);
      if (prot) breakdown.push({ label: prot.name, amount: Number(prot.price) });
    }

    for (const addonId of selectedAddons) {
      const addon = addonServices.find(a => a.id === addonId);
      if (addon) breakdown.push({ label: addon.name, amount: Number(addon.price) });
    }

    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
    const deposit = Math.round(total * 0.2);
    return { total, deposit, breakdown };
  }, [shopConfig, pricingRules, vehicleSize, interiorCondition, exteriorCondition, serviceType, selectedProtection, selectedAddons]);

  function toggleAddon(id) {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !phone) return alert('All contact inputs are required.');
    if (!appointmentDate || !appointmentTime) return alert('Please select an appointment date and time.');
    setIsSubmitting(true);
    setBookingError(null);

    const newBookingId = generateBookingId();

    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .insert([{ shop_id: shopId, full_name: fullName, email, phone }])
        .select().single();

      if (customerError) throw customerError;

      const quotePayload = {
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
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        service_type: serviceType,
      };

      if (serviceType !== 'detailing' && selectedProtection) {
        quotePayload.protection_service_id = selectedProtection;
      }

      if (selectedAddons.length) {
        quotePayload.addon_ids = selectedAddons;
      }

      const { error: quoteError } = await supabase.from('quotes').insert([quotePayload]);
      if (quoteError) throw quoteError;

      setBookingId(newBookingId);

      if (stripePromise && shopConfig?.stripe_account_id) {
        const res = await fetch('/api/stripe/create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: priceCalculations.deposit, shopId, bookingId: newBookingId }),
        });
        const data = await res.json();
        if (data.clientSecret) setClientSecret(data.clientSecret);
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
          <p className="text-xs text-slate-400">Appointment: {appointmentDate} at {appointmentTime}</p>
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
          <p className="text-xs text-slate-400 mt-1">Appointment: {appointmentDate} at {appointmentTime}</p>
        </div>

        <p className="text-xs text-slate-400 text-center mb-3">Estimated total: ${priceCalculations.total} (20% deposit: ${priceCalculations.deposit})</p>

        {clientSecret && stripePromise ? (
          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Pay deposit now</p>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentForm
                bookingId={bookingId} amount={priceCalculations.deposit} clientSecret={clientSecret}
                onComplete={() => {
                  supabase.from('quotes').update({ payment_status: 'paid', final_status: 'booked' }).eq('booking_id', bookingId).then();
                  setBookingState('confirmed');
                }}
              />
            </Elements>
          </div>
        ) : (
          <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
            {shopConfig.payment_info && (
              <p className="text-xs text-center text-slate-600">
                Send the deposit via: <span className="font-bold text-blue-700">{shopConfig.payment_info}</span>
              </p>
            )}
            <button onClick={() => { supabase.from('quotes').update({ final_status: 'booked' }).eq('booking_id', bookingId).then(); setBookingState('confirmed'); }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl tracking-wider uppercase transition">
              Done — I'll pay the deposit
            </button>
          </div>
        )}

        {bookingError && <p className="text-xs text-red-500 text-center mt-2">{bookingError}</p>}
      </div>
    );
  }

  const showDetailing = serviceType === 'detailing' || serviceType === 'both';
  const showProtection = (serviceType === 'protection' || serviceType === 'both') && shopConfig.provides_protection && protectionServices.length > 0;

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-100 shadow-2xl rounded-2xl p-6 font-sans text-slate-800">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{shopConfig.business_name}</h2>
        <p className="text-xs text-slate-400 mt-0.5">Instant Visual Quote Generator</p>
      </div>

      <form onSubmit={handleBookingSubmit} className="space-y-4">
        {(shopConfig.service_type === 'both') && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Service Type</label>
            <div className="grid grid-cols-2 gap-2">
              {['detailing', 'protection'].map(t => (
                <button key={t} type="button" onClick={() => setServiceType(t)}
                  className={`py-2 px-1 text-xs capitalize font-semibold rounded-xl border transition ${serviceType === t ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  {t === 'detailing' ? 'Detailing' : 'Paint Protection'}
                </button>
              ))}
              {shopConfig.service_type === 'both' && serviceType !== 'both' && (
                <button key="both-option" type="button" onClick={() => setServiceType('both')}
                  className={`py-2 px-1 text-xs capitalize font-semibold rounded-xl border transition col-span-2 ${serviceType === 'both' ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                  Both
                </button>
              )}
            </div>
          </div>
        )}

        {showDetailing && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{showProtection ? '2a.' : '1.'} Select Car Size</label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{showProtection ? '2b.' : '2.'} Interior Condition</label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{showProtection ? '2c.' : '3.'} Exterior Condition</label>
              <div className="grid grid-cols-3 gap-2">
                {['clean', 'dirty', 'disaster'].map((cond) => (
                  <button key={cond} type="button" onClick={() => setExteriorCondition(cond)}
                    className={`py-2 px-1 text-xs capitalize font-semibold rounded-xl border transition-all duration-150 ${exteriorCondition === cond ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                    {cond}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {showProtection && (
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {showDetailing ? 'Optional:' : ''} Paint Protection / Ceramic
            </label>
            <select value={selectedProtection || ''} onChange={(e) => setSelectedProtection(e.target.value || null)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:border-blue-500">
              <option value="">{showDetailing ? 'Not selected' : 'Select a service'}</option>
              {protectionServices.filter(p => p.vehicle_size === vehicleSize || !showDetailing).map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.vehicle_size}) — ${p.price}</option>
              ))}
            </select>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100">
          <button type="button" onClick={() => setShowAddons(!showAddons)}
            className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <span>{showAddons ? '−' : '+'}</span> Add More Services
          </button>
          {showAddons && addonServices.length > 0 && (
            <div className="mt-2 space-y-1">
              {addonServices.map(addon => (
                <label key={addon.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedAddons.includes(addon.id)} onChange={() => toggleAddon(addon.id)}
                    className="w-3.5 h-3.5 rounded border-slate-300" />
                  <span className="text-xs text-slate-700">{addon.name} <span className="text-slate-400">(+${addon.price})</span></span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Information</label>
          <input type="text" placeholder="Your Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
          <input type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
          <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preferred Appointment</label>
          <input type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50/50" />
          {appointmentDate && (
            <div>
              {availableSlots.length === 0 ? (
                <p className="text-xs text-amber-600">No available slots for this date.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {availableSlots.map(slot => (
                    <button key={slot} type="button" onClick={() => setAppointmentTime(slot)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-lg border transition ${appointmentTime === slot ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mt-3 space-y-1 text-xs">
          {priceCalculations.breakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between text-slate-600">
              <span>{item.label}</span>
              <span className="font-semibold text-slate-900">${item.amount}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-emerald-600 pt-1.5 border-t border-dashed border-slate-200">
            <span>20% Booking Deposit:</span>
            <span>${priceCalculations.deposit}</span>
          </div>
        </div>

        {bookingError && <p className="text-xs text-red-500 text-center">{bookingError}</p>}

        <button type="submit" disabled={isSubmitting}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl tracking-wider uppercase shadow-md transition disabled:opacity-50">
          {isSubmitting ? 'Securing Booking...' : `Request Slot — $${priceCalculations.deposit} Deposit`}
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
