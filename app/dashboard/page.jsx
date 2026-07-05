'use client';
import { Suspense, useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import SetupTab from './SetupTab';
import PreviewTab from './PreviewTab';
import ScheduleTab from './ScheduleTab';
import StatusTab from './StatusTab';

const TABS = [
  { key: 'setup', label: 'Set Up' },
  { key: 'preview', label: 'Preview' },
  { key: 'schedule', label: 'Schedule Setter' },
  { key: 'status', label: 'Service Status' },
];

function DashboardContent() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const [session, setSession] = useState(null);
  const [shop, setShop] = useState(null);
  const [pricingRules, setPricingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('setup');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/login');
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (!session) return;
    loadData();
  }, [session]);

  async function loadData() {
    const email = session.user.email;

    const { data: shopData } = await supabase
      .from('shops')
      .select('*')
      .eq('owner_email', email)
      .single();

    if (!shopData) {
      setLoading(false);
      return;
    }

    const { data: rulesData } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('shop_id', shopData.id);

    setShop(shopData);
    setPricingRules(rulesData || []);
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Loading...</div>;

  if (!shop) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-red-400 font-medium">No shop found for your email</p>
      <p className="text-slate-300 text-sm mt-2">Logged in as: <span className="font-mono bg-slate-700 px-2 py-0.5 rounded">{session?.user?.email}</span></p>
      <p className="text-slate-400 text-xs mt-2">Check that this email matches the <code className="bg-slate-700 px-1 rounded">owner_email</code> in your Supabase <code className="bg-slate-700 px-1 rounded">shops</code> table.</p>
      <button onClick={handleSignOut} className="mt-4 text-sm text-blue-400 underline">Sign out</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 px-6 py-3 flex items-center justify-between">
        <h1 className="text-sm font-bold tracking-wide">{shop.business_name}</h1>
        <div className="flex items-center gap-3">
          {session.user.email === (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ADMIN_EMAIL : null) && (
            <button onClick={() => router.push('/admin/add-shop')} className="text-xs text-slate-400 hover:text-white transition">Add Shop</button>
          )}
          <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-white transition">Sign out</button>
        </div>
      </header>

      <div className="border-b border-slate-700 px-6">
        <div className="max-w-2xl mx-auto flex gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-bold tracking-wide transition border-b-2 -mb-[1px] ${activeTab === tab.key ? 'text-blue-400 border-blue-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {activeTab === 'setup' && (
          <SetupTab supabase={supabase} shop={shop} setShop={setShop}
            pricingRules={pricingRules} setPricingRules={setPricingRules} session={session} />
        )}
        {activeTab === 'preview' && <PreviewTab shop={shop} />}
        {activeTab === 'schedule' && <ScheduleTab supabase={supabase} shop={shop} />}
        {activeTab === 'status' && <StatusTab supabase={supabase} shop={shop} />}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-sm">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
