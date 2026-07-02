import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          Now In Private Beta
        </span>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
          Stop Losing Margins on No-Shows & Under-Quoted Cleanings.
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto">
          The ultimate embeddable operating system framework for independent vehicle detailing operations. Collect 20% security deposits right inside your website.
        </p>
        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/embed/quote" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium tracking-wide transition text-center shadow-lg shadow-blue-600/20">
            View Live Widget Demo
          </Link>
          <a href="https://vercel.com" target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-6 py-3 rounded-xl font-medium transition text-center">
            Deploy via Vercel Secure
          </a>
        </div>
      </div>
      <footer className="absolute bottom-6 text-xs text-slate-500">
        © 2026 DetailerShield OS. All rights reserved safely.
      </footer>
    </div>
  );
}