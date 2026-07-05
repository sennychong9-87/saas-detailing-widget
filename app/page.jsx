import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-sm font-bold tracking-wide">DetailerShield OS</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-xs text-slate-300 hover:text-white transition px-3 py-1.5">Sign In</Link>
          <Link href="/login?mode=signup" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition">Get Started</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Now In Private Beta
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Embeddable Booking & Inspection OS for Detailers
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Your customers book, pay deposits, and complete walk-around inspections — all inside your own website. No more no-shows, no more under-quoting.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/login" className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition">Sign In</Link>
            <Link href="/login?mode=signup" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition shadow-lg shadow-blue-600/20">Get Started — It&apos;s Free</Link>
            <Link href="/embed/quote" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-sm font-medium transition">View Live Widget Demo</Link>
          </div>
        </div>

        <div className="mt-24 max-w-lg mx-auto">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center mx-auto text-lg font-bold">✓</div>
            <h3 className="text-sm font-bold text-center">Everything You Need to Run Your Detailing Business</h3>
            <ul className="text-xs text-slate-400 leading-relaxed space-y-1.5">
              <li>✓ Set your own pricing — base prices &amp; condition modifiers</li>
              <li>✓ Paint protection &amp; ceramic coating pricing</li>
              <li>✓ Add-on services with custom pricing</li>
              <li>✓ Offer detailing, protection, or both</li>
              <li>✓ Weekend surcharge (15%)</li>
              <li>✓ Collect 20% deposits by card via Stripe — funds go directly to you</li>
              <li>✓ Set your schedule: hours, days off, number of bays, job times</li>
              <li>✓ Customers pick from real-time available slots</li>
              <li>✓ Calendar-based service status with check-in flow</li>
              <li>✓ Walk-around inspection with 5-side photo capture</li>
              <li>✓ Preview your widget before sharing</li>
              <li>✓ One-click embed code for your website</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link href="/login?mode=signup" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition shadow-lg shadow-blue-600/20">
            Get Started — It&apos;s Free
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-6 max-w-5xl mx-auto text-center text-xs text-slate-500">
        &copy; 2026 DetailerShield OS. All rights reserved.
      </footer>
    </div>
  );
}