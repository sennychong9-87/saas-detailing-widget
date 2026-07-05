'use client';
import { useState, useEffect } from 'react';

const VEHICLE_SIZES = ['sedan', 'suv', 'truck'];
const CONDITIONS = ['clean', 'dirty', 'disaster'];
const DAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
];

export default function ScheduleTab({ supabase, shop }) {
  const [settings, setSettings] = useState(null);
  const [timeEstimates, setTimeEstimates] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, [shop.id]);

  async function loadData() {
    const { data: s } = await supabase.from('schedule_settings').select('*').eq('shop_id', shop.id).single();
    if (s) setSettings(s);
    else setSettings({ work_start: '09:00', work_end: '17:00', working_days: [1, 2, 3, 4, 5], bays: 1, slot_duration: 60 });

    const { data: te } = await supabase.from('job_time_estimates').select('*').eq('shop_id', shop.id);
    if (te) {
      const map = {};
      te.forEach(item => { map[`${item.vehicle_size}-${item.interior_condition}-${item.exterior_condition}`] = item.estimated_minutes; });
      setTimeEstimates(map);
    }
  }

  function updateSettings(field, value) {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function toggleDay(day) {
    const current = settings.working_days || [];
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day].sort();
    updateSettings('working_days', updated);
  }

  function updateEstimate(vSize, iCond, eCond, value) {
    setTimeEstimates(prev => ({ ...prev, [`${vSize}-${iCond}-${eCond}`]: Number(value) }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const payload = {
      shop_id: shop.id,
      work_start: settings.work_start,
      work_end: settings.work_end,
      working_days: settings.working_days,
      bays: Number(settings.bays),
      slot_duration: Number(settings.slot_duration),
    };

    const { error } = settings.id
      ? await supabase.from('schedule_settings').update(payload).eq('id', settings.id)
      : await supabase.from('schedule_settings').insert(payload);

    if (error) return alert('Failed to save schedule: ' + error.message);

    for (const vs of VEHICLE_SIZES) {
      for (const ic of CONDITIONS) {
        for (const ec of CONDITIONS) {
          const key = `${vs}-${ic}-${ec}`;
          const mins = timeEstimates[key];
          if (mins) {
            await supabase.from('job_time_estimates').upsert(
              { shop_id: shop.id, vehicle_size: vs, interior_condition: ic, exterior_condition: ec, estimated_minutes: Number(mins) },
              { onConflict: 'shop_id, vehicle_size, interior_condition, exterior_condition' }
            );
          }
        }
      }
    }

    setSaving(false);
    setSaved(true);
  }

  if (!settings) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6">
      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Working Hours</h2>
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Start</label>
            <input type="time" value={settings.work_start} onChange={(e) => updateSettings('work_start', e.target.value)}
              className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">End</label>
            <input type="time" value={settings.work_end} onChange={(e) => updateSettings('work_end', e.target.value)}
              className="px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg" />
          </div>
        </div>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Working Days</h2>
        <div className="flex gap-2">
          {DAYS.map(day => (
            <button key={day.value} onClick={() => toggleDay(day.value)}
              className={`px-3 py-2 text-xs font-bold rounded-xl transition ${(settings.working_days || []).includes(day.value) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
              {day.label}
            </button>
          ))}
        </div>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Work bays & Slot Duration</h2>
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Number of bays</label>
            <input type="number" min="1" max="20" value={settings.bays} onChange={(e) => updateSettings('bays', e.target.value)}
              className="w-20 px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">Slot duration (min)</label>
            <input type="number" min="15" step="15" value={settings.slot_duration} onChange={(e) => updateSettings('slot_duration', e.target.value)}
              className="w-20 px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg" />
          </div>
        </div>
      </section>

      <section className="bg-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Job Times (minutes)</h2>
        <p className="text-xs text-slate-400">Set how long each job combination takes. This determines available booking slots in the widget.</p>
        {VEHICLE_SIZES.map(vs => (
          <div key={vs} className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase">{vs === 'truck' ? 'Truck/Van' : vs}</h3>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map(ic => (
                <div key={ic} className="space-y-1">
                  <p className="text-xs text-slate-500 uppercase">Int: {ic}</p>
                  {CONDITIONS.map(ec => (
                    <div key={ec} className="flex items-center gap-1">
                      <span className="text-xs text-slate-500 w-14">Ext: {ec}</span>
                      <input type="number" min="15" step="5" value={timeEstimates[`${vs}-${ic}-${ec}`] || ''}
                        onChange={(e) => updateEstimate(vs, ic, ec, e.target.value)}
                        className="w-16 px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded-lg" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl tracking-wider transition disabled:opacity-50">
        {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Schedule'}
      </button>
    </div>
  );
}
