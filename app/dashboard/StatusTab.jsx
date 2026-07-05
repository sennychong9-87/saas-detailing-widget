'use client';
import { useState, useEffect } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StatusTab({ supabase, shop }) {
  const [bookings, setBookings] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    loadBookings();
  }, [shop.id]);

  async function loadBookings() {
    const { data } = await supabase
      .from('quotes')
      .select('*, customers(*)')
      .eq('shop_id', shop.id)
      .order('appointment_date', { ascending: true });
    if (data) setBookings(data);
  }

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  function getBookingsForDate(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return bookings.filter(b => b.appointment_date === dateStr);
  }

  function statusColor(status) {
    switch (status) {
      case 'booked': return 'bg-blue-900/50 text-blue-300';
      case 'checked_in': return 'bg-amber-900/50 text-amber-300';
      case 'in_progress': return 'bg-purple-900/50 text-purple-300';
      case 'completed': return 'bg-emerald-900/50 text-emerald-300';
      case 'cancelled': return 'bg-red-900/50 text-red-300';
      default: return 'bg-slate-600 text-slate-300';
    }
  }

  async function updateStatus(bookingId, newStatus) {
    setUpdatingStatus(bookingId);
    await supabase.from('quotes').update({ final_status: newStatus }).eq('booking_id', bookingId);
    loadBookings();
    if (selectedBookings.length) {
      setSelectedBookings(prev => prev.map(b => b.booking_id === bookingId ? { ...b, final_status: newStatus } : b));
    }
    setUpdatingStatus(null);
  }

  function viewDate(day) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setSelectedBookings(getBookingsForDate(day));
  }

  return (
    <div className="space-y-6">
      <section className="bg-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCalendarDate(new Date(year, month - 1))} className="text-slate-400 hover:text-white text-lg px-2">‹</button>
          <h2 className="text-sm font-bold">{MONTHS[month]} {year}</h2>
          <button onClick={() => setCalendarDate(new Date(year, month + 1))} className="text-slate-400 hover:text-white text-lg px-2">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAYS.map(d => <div key={d} className="text-[10px] text-slate-500 font-bold uppercase py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            const dayBookings = day ? getBookingsForDate(day) : [];
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            const isSelected = selectedDate === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            return (
              <div key={idx}
                onClick={() => day && viewDate(day)}
                className={`relative p-2 rounded-lg text-xs cursor-pointer transition ${isSelected ? 'ring-2 ring-blue-500 bg-slate-700' : 'hover:bg-slate-700/50'} ${!day ? 'invisible' : ''} ${isToday ? 'font-bold text-blue-400' : 'text-slate-300'}`}>
                <span>{day}</span>
                {dayBookings.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayBookings.some(b => b.final_status === 'booked' || !b.final_status) && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                    {dayBookings.some(b => b.final_status === 'in_progress') && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                    {dayBookings.some(b => b.final_status === 'completed') && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selectedDate && (
        <section className="bg-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bookings — {selectedDate}</h2>
            <button onClick={() => { setSelectedDate(null); setSelectedBookings([]); }} className="text-xs text-slate-500 hover:text-white">Close</button>
          </div>
          {selectedBookings.length === 0 ? (
            <p className="text-xs text-slate-500">No bookings for this date.</p>
          ) : (
            <div className="space-y-2">
              {selectedBookings.map(b => (
                <div key={b.id} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-300">{b.booking_id}</span>
                      <span className="text-xs text-slate-400 ml-2">{b.customers?.full_name} ({b.customers?.phone})</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(b.final_status || 'booked')}`}>
                      {b.final_status || 'booked'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex gap-3">
                    <span>{b.vehicle_size} · Int: {b.interior_condition} · Ext: {b.exterior_condition}</span>
                    <span>{b.appointment_time}</span>
                  </div>
                  <div className="flex gap-1.5">
                    {['checked_in', 'in_progress', 'completed', 'cancelled'].map(s => (
                      <button key={s} onClick={() => updateStatus(b.booking_id, s)}
                        disabled={updatingStatus === b.booking_id}
                        className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition ${(b.final_status || 'booked') === s ? statusColor(s) : 'bg-slate-600 text-slate-400 hover:bg-slate-500'}`}>
                        {updatingStatus === b.booking_id ? '...' : s.replace('_', ' ')}
                      </button>
                    ))}
                    <a href={`/inspect?booking_id=${b.booking_id}`} target="_blank"
                      className="text-[10px] px-2 py-0.5 rounded-lg font-medium bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 transition">
                      Inspect
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
