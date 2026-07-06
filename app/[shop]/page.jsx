import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ShopPage({ params }) {
  const { shop } = params;
  const supabase = createClient();

  const { data: shopData } = await supabase
    .from('shops')
    .select('*')
    .eq('shop_slug', shop)
    .single();

  if (!shopData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Shop not found</h1>
          <p className="text-slate-400 text-sm">No shop found at this URL. Check the link or contact the detailer.</p>
          <Link href="/" className="inline-block text-xs text-blue-400 underline">Go home</Link>
        </div>
      </div>
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://detailershield.vercel.app';

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-200 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{shopData.business_name}</h1>
          <p className="text-xs text-slate-500">Book your detailing appointment online</p>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-8">
        <iframe
          src={`${origin}/embed/quote?shop_id=${shopData.id}`}
          width="100%"
          height="720"
          className="border border-slate-200 rounded-xl shadow-sm"
        />
      </main>
      <footer className="border-t border-slate-200 px-6 py-4 text-center text-xs text-slate-400">
        Powered by <a href="https://detailershield.vercel.app" className="text-blue-600 underline">DetailerShield OS</a>
      </footer>
    </div>
  );
}
