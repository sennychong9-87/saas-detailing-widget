import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { shopEmail, shopName, bookingId, customerName, appointmentDate, appointmentTime, deposit, customerEmail, customerPhone, vehicleSize, interiorCondition, exteriorCondition } = await request.json();

    if (!shopEmail) return NextResponse.json({ error: 'Missing shopEmail' }, { status: 400 });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e293b;color:white;padding:20px;border-radius:12px 12px 0 0;text-align:center">
          <h2 style="margin:0;font-size:18px">New Booking Confirmed</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.8">${shopName}</p>
        </div>
        <div style="padding:20px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:28px;font-weight:bold;font-family:monospace;color:#1d4ed8;letter-spacing:2px">${bookingId}</div>
            <div style="font-size:12px;color:#64748b">Booking ID — save this for inspection day</div>
          </div>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:6px 0;color:#64748b">Customer</td><td style="padding:6px 0;font-weight:600">${customerName}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Email</td><td style="padding:6px 0">${customerEmail || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Phone</td><td style="padding:6px 0">${customerPhone || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Appointment</td><td style="padding:6px 0;font-weight:600">${appointmentDate || '—'} at ${appointmentTime || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Vehicle</td><td style="padding:6px 0;text-transform:capitalize">${vehicleSize || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Interior</td><td style="padding:6px 0;text-transform:capitalize">${interiorCondition || '—'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b">Exterior</td><td style="padding:6px 0;text-transform:capitalize">${exteriorCondition || '—'}</td></tr>
            <tr><td style="padding:8px 0 0;color:#64748b;border-top:1px solid #e2e8f0">Deposit</td><td style="padding:8px 0 0;border-top:1px solid #e2e8f0;font-weight:700;color:#059669;font-size:15px">$${deposit || '0'}</td></tr>
          </table>
          <div style="margin-top:20px;padding:12px;background:#f1f5f9;border-radius:8px;font-size:12px;color:#475569">
            On service day, use the inspection tool to capture 5-side photos and note the actual vehicle condition.
          </div>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'DetailerShield <onboarding@resend.dev>',
        to: shopEmail,
        subject: `New Booking — ${bookingId} — ${customerName}`,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.message || 'Failed to send' }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
