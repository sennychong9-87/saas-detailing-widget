'use client';

export default function PreviewTab({ shop }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const widgetUrl = `${origin}/embed/quote?shop_id=${shop.id}`;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">This is how your booking widget appears to customers. Resize your browser to test responsiveness.</p>
      <div className="bg-white rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
        <div className="bg-slate-100 px-3 py-1.5 flex items-center gap-2 border-b border-slate-200">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-slate-400 font-mono ml-2 truncate">{widgetUrl}</span>
        </div>
        <iframe src={widgetUrl} className="w-full" style={{ height: '620px' }} title="Widget Preview" />
      </div>
    </div>
  );
}
