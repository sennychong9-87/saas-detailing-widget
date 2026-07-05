'use client';
import { useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const SIDES = [
  { key: 'front_image', label: 'Front' },
  { key: 'rear_image', label: 'Rear' },
  { key: 'driver_image', label: 'Driver Side' },
  { key: 'passenger_image', label: 'Passenger Side' },
  { key: 'roof_image', label: 'Roof' },
];

const SIZES = ['sedan', 'suv', 'truck'];
const CONDITIONS = ['clean', 'dirty', 'disaster'];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function InspectPage() {
  const [bookingId, setBookingId] = useState('');
  const [booking, setBooking] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [captured, setCaptured] = useState({});
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [actualSize, setActualSize] = useState('');
  const [actualInterior, setActualInterior] = useState('');
  const [actualExterior, setActualExterior] = useState('');
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  async function lookupBooking() {
    setError(null);
    const { data, error } = await supabase
      .from('quotes')
      .select('*, customers(*)')
      .eq('booking_id', bookingId.toUpperCase())
      .single();

    if (error || !data) return setError('Booking not found');
    setBooking(data);
    setActualSize(data.vehicle_size);
    setActualInterior(data.interior_condition);
    setActualExterior(data.exterior_condition);
  }

  const startCamera = useCallback(async () => {
    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    setStream(s);
    setCameraActive(true);
    if (videoRef.current) videoRef.current.srcObject = s;
  }, []);

  function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraActive(false);
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCaptured(prev => ({ ...prev, [SIDES[currentStep].key]: dataUrl }));
  }

  function nextSide() { stopCamera(); if (currentStep < SIDES.length - 1) setCurrentStep(c => c + 1); }
  function prevSide() { stopCamera(); if (currentStep > 0) setCurrentStep(c => c - 1); }

  async function submitInspection() {
    setSubmitting(true);
    setError(null);
    const images = {};

    for (const side of SIDES) {
      const dataUrl = captured[side.key];
      if (!dataUrl) continue;
      const blob = await fetch(dataUrl).then(r => r.blob());
      const path = `${bookingId}/${side.key}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('inspection-images')
        .upload(path, blob, { upsert: true });

      if (uploadError) {
        setError('Failed to upload ' + side.label + ': ' + uploadError.message);
        setSubmitting(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('inspection-images').getPublicUrl(path);
      images[side.key] = publicUrl;
    }

    const { error: insError } = await supabase.from('inspections').insert([{ booking_id: bookingId, ...images }]);
    if (insError) { setError('Failed to save inspection: ' + insError.message); setSubmitting(false); return; }

    const conditionChanged = actualSize !== booking.vehicle_size || actualInterior !== booking.interior_condition || actualExterior !== booking.exterior_condition;
    if (conditionChanged || adjustmentNote) {
      await supabase.from('quotes').update({
        actual_vehicle_size: actualSize,
        actual_interior_condition: actualInterior,
        actual_exterior_condition: actualExterior,
        price_adjustment_note: adjustmentNote,
      }).eq('booking_id', bookingId);
    }

    setSubmitting(false);
    setDone(true);
    stopCamera();
  }

  if (done) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
        <h2 className="text-lg font-bold text-slate-900 mt-4">Inspection Complete</h2>
        <p className="text-xs text-slate-500 mt-2">All 5 sides captured for booking <span className="font-mono font-bold text-slate-800">{bookingId}</span></p>
      </div>
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
        <h1 className="text-lg font-bold text-slate-900 text-center mb-4">Walk-around Inspection</h1>
        <input value={bookingId} onChange={e => setBookingId(e.target.value.toUpperCase())} placeholder="Enter Booking ID (e.g. DW-A7X9K2)" className="w-full px-3 py-2 text-sm border rounded-lg mb-3 focus:outline-none focus:border-blue-500" />
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <button onClick={lookupBooking} className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-xl">Look Up Booking</button>
      </div>
    </div>
  );

  const currentSide = SIDES[currentStep];
  const hasCapture = !!captured[currentSide.key];
  const allCaptured = SIDES.every(s => !!captured[s.key]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="text-center mb-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Booking</p>
          <p className="text-sm font-mono font-bold text-slate-900">{bookingId}</p>
          <p className="text-xs text-slate-500 mt-1">{booking.customers?.full_name} — {booking.customers?.phone}</p>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs mb-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Booked: {booking.vehicle_size} · Int: {booking.interior_condition} · Ext: {booking.exterior_condition}</p>
          <p className="text-[10px] text-slate-400">Verify actual condition below if different from booked.</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <select value={actualSize} onChange={e => setActualSize(e.target.value)}
              className="text-[10px] px-1.5 py-1 border border-slate-200 rounded bg-white">
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={actualInterior} onChange={e => setActualInterior(e.target.value)}
              className="text-[10px] px-1.5 py-1 border border-slate-200 rounded bg-white">
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={actualExterior} onChange={e => setActualExterior(e.target.value)}
              className="text-[10px] px-1.5 py-1 border border-slate-200 rounded bg-white">
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Price adjustment note (e.g. upgraded to disaster, +$50)"
            value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)}
            className="w-full mt-1 text-[10px] px-1.5 py-1 border border-slate-200 rounded bg-white" />
        </div>

        <div className="flex gap-1 justify-center mb-4">
          {SIDES.map((s, i) => (
            <button key={s.key} onClick={() => { setCurrentStep(i); stopCamera(); }}
              className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-blue-600' : captured[s.key] ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          ))}
        </div>

        <p className="text-xs font-bold text-slate-600 text-center mb-3">{currentSide.label} — {hasCapture ? 'Captured' : 'Position camera and capture'}</p>

        {!cameraActive && !hasCapture && (
          <button onClick={startCamera} className="w-full py-10 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-sm hover:border-blue-400 transition mb-3">
            Open Camera
          </button>
        )}

        {cameraActive && (
          <div className="space-y-3">
            <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-black" />
            <button onClick={capture} className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-xl">Capture</button>
          </div>
        )}

        {hasCapture && (
          <div className="space-y-3">
            <img src={captured[currentSide.key]} alt={currentSide.label} className="w-full rounded-xl border" />
            <div className="flex gap-2">
              <button onClick={() => { setCaptured(prev => { const n = { ...prev }; delete n[currentSide.key]; return n; }); stopCamera(); }} className="flex-1 py-2 border border-slate-300 text-slate-600 text-sm rounded-xl">Retake</button>
              {currentStep < SIDES.length - 1 && <button onClick={nextSide} className="flex-1 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl">Next Side</button>}
              {currentStep === SIDES.length - 1 && allCaptured && (
                <button onClick={submitInspection} disabled={submitting} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl disabled:opacity-50">
                  {submitting ? 'Uploading...' : 'Submit Inspection'}
                </button>
              )}
            </div>
          </div>
        )}

        {!cameraActive && hasCapture && currentStep > 0 && (
          <button onClick={prevSide} className="w-full mt-2 text-xs text-slate-400 underline">Previous side</button>
        )}

        <canvas ref={canvasRef} className="hidden" />

        {!allCaptured && (
          <div className="mt-4 text-xs text-slate-400 text-center">
            Captured: {Object.keys(captured).length} / {SIDES.length} sides
          </div>
        )}
      </div>
    </div>
  );
}
