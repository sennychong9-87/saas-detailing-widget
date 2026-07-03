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

        <div className="mt-24 grid sm:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center space-y-3">
            <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center mx-auto text-lg font-bold">1</div>
            <h3 className="text-sm font-bold">For Detailers</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Set your own prices, connect your payment method, and embed the booking widget on your site. Customers pay you directly — no middleman.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center space-y-3">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center mx-auto text-lg font-bold">2</div>
            <h3 className="text-sm font-bold">For Car Owners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Get an instant quote, pay a 20% deposit, and complete a 5-side walk-around inspection. Your booking ID locks everything in.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 text-center space-y-3">
            <div className="w-10 h-10 bg-purple-500/10 text-purple-400 rounded-lg flex items-center justify-center mx-auto text-lg font-bold">3</div>
            <h3 className="text-sm font-bold">For Platform Owners</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Run the entire system on Supabase. No payment handling during beta — monetize later with Paddle subscriptions.</p>
          </div>
        </div>

        <div className="mt-20 text-center">
          <h2 className="text-lg font-bold mb-6">Ready to deploy your own instance?</h2>
          <a href="https://vercel.com/new" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-xl text-sm font-bold transition shadow-lg">
            <svg viewBox="0 0 284 65" className="h-4 w-auto fill-current"><path d="M141.68 16.25c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.46-6.5 4.79 0 8.21 2.51 9.46 6.5h-18.92zm117.14-14.5c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.46 6.5h-18.91zm-39.03 3.5c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9v-46h9zM37.59.25l36.95 64H.64l36.95-64zm92.38 5l-27.71 48-27.71-48h10.39l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9v-34h9v9.2c0 5.08 5.91 9.2 13.2 9.2z"/></svg>
            Deploy via Vercel
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-6 max-w-5xl mx-auto text-center text-xs text-slate-500">
        &copy; 2026 DetailerShield OS. All rights reserved.
      </footer>
    </div>
  );
}