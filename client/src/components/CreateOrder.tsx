import React from "react";
import { createOrder } from "../api";
import type { OrderDto } from "../types";
import { PlusCircle, Loader2, CheckCircle2 } from "lucide-react";

function num(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmtMoney(n: number) {
  return n.toFixed(2);
}

export function CreateOrder() {
  const [latitude, setLatitude] = React.useState("40.751886");
  const [longitude, setLongitude] = React.useState("-73.807113");
  const [subtotal, setSubtotal] = React.useState("100");
  const [timestamp, setTimestamp] = React.useState("");
  const [externalId, setExternalId] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [created, setCreated] = React.useState<OrderDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit() {
    const lat = num(latitude);
    const lon = num(longitude);
    const sub = num(subtotal);

    if (lat === null || lon === null || sub === null) {
      setError("Please enter valid numbers for latitude/longitude/subtotal.");
      return;
    }

    setLoading(true);
    setError(null);
    setCreated(null);

    try {
      const payload: any = { latitude: lat, longitude: lon, subtotal: sub };
      if (timestamp.trim()) payload.timestamp = new Date(timestamp).toISOString();
      if (externalId.trim()) payload.external_id = externalId.trim();

      const r = await createOrder(payload);
      setCreated(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-[var(--font-serif)] tracking-tight text-white mb-4">Manual Entry</h2>
        <p className="text-slate-500 text-sm font-[var(--font-mono)] uppercase tracking-widest">Create a single drone delivery record</p>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 md:p-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">External ID</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-white py-2 outline-none transition-colors text-sm placeholder:text-slate-700"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Timestamp</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-white py-2 outline-none transition-colors text-sm placeholder:text-slate-700"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="Optional (ISO 8601)"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Latitude</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-white py-2 outline-none transition-colors text-sm font-[var(--font-mono)] placeholder:text-slate-700"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Longitude</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-white py-2 outline-none transition-colors text-sm font-[var(--font-mono)] placeholder:text-slate-700"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Subtotal ($)</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-white py-2 outline-none transition-colors text-3xl font-[var(--font-mono)] placeholder:text-slate-700"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-[var(--font-mono)]">Uses API logic: NY rate or out_of_state 0%</p>
          <button
            className="px-6 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 text-sm"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
            {loading ? "Creating..." : "Create Order"}
          </button>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}
      </div>

      {created && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">Order Created</h3>
              {created.composite_tax_rate === 0 ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Out of State (0%)
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> NY Rate Resolved
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Order ID</p>
                <p className="text-sm font-[var(--font-mono)] text-slate-300 truncate" title={created.id}>
                  {created.id}
                </p>
              </div>
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Tax Rate</p>
                <p className="text-2xl font-[var(--font-mono)] text-white">{created.composite_tax_rate}</p>
              </div>
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Tax Amount</p>
                <p className="text-2xl font-[var(--font-mono)] text-white">${fmtMoney(created.tax_amount)}</p>
              </div>
              <div className="bg-white/[0.05] p-5 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-widest mb-2">Total</p>
                <p className="text-2xl font-[var(--font-mono)] text-white">${fmtMoney(created.total_amount)}</p>
              </div>
            </div>
          </div>

          <details className="group">
            <summary className="px-8 py-4 text-xs font-semibold uppercase tracking-widest text-slate-500 cursor-pointer hover:bg-white/[0.02] transition-colors select-none flex items-center list-none">
              <svg className="w-4 h-4 mr-3 text-slate-600 group-open:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View JSON Response
            </summary>
            <div className="p-8 bg-black/20 text-slate-400 text-xs font-[var(--font-mono)] overflow-x-auto border-t border-white/5">
              <pre>{JSON.stringify(created, null, 2)}</pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
