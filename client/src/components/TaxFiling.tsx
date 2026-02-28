import React from "react";
import { downloadFilingCsv, getFilingSummary } from "../api";
import type { FilingSummaryResponse } from "../types";
import { Download, RefreshCw, Calendar } from "lucide-react";

function money(n: number) {
  return n.toFixed(2);
}

function isoDateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfQuarter(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3);
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3, 1, 0, 0, 0));
}

function endOfQuarter(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3);
  const startNext = new Date(Date.UTC(d.getUTCFullYear(), (q + 1) * 3, 1, 0, 0, 0));
  return new Date(startNext.getTime() - 1);
}

export function TaxFiling() {
  const now = new Date();
  const qStart = startOfQuarter(now);
  const qEnd = endOfQuarter(now);

  const [dateFrom, setDateFrom] = React.useState(isoDateOnly(qStart));
  const [dateTo, setDateTo] = React.useState(isoDateOnly(qEnd));

  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<FilingSummaryResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.dateFrom = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
      if (dateTo) params.dateTo = new Date(`${dateTo}T23:59:59.999Z`).toISOString();

      const r = await getFilingSummary(params);
      setData(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    const params: Record<string, string> = {};
    if (dateFrom) params.dateFrom = new Date(`${dateFrom}T00:00:00.000Z`).toISOString();
    if (dateTo) params.dateTo = new Date(`${dateTo}T23:59:59.999Z`).toISOString();
    await downloadFilingCsv(params);
  }

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-[var(--font-serif)] text-white tracking-tight">Tax Filing</h1>
          <p className="text-sm text-slate-500 mt-2 font-[var(--font-mono)] uppercase tracking-widest">
            Jurisdiction Summary (Reporting Codes)
          </p>
        </div>

        <div className="flex gap-3 mt-6 md:mt-0">
          <button
            onClick={load}
            disabled={loading}
            className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded text-xs font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>

          <button
            onClick={exportCsv}
            disabled={!data || loading}
            className="bg-white/[0.03] text-slate-200 border border-white/10 px-4 py-2 rounded text-xs font-medium hover:bg-white/[0.06] transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Filing Period
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Date From</label>
            <input
              type="date"
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-slate-200 py-2 outline-none transition-colors"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Date To</label>
            <input
              type="date"
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-slate-200 py-2 outline-none transition-colors"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm py-3"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Calculate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Orders</p>
            <p className="text-2xl font-mono text-white">{data.totals.orders_count}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Taxable Sales</p>
            <p className="text-2xl font-mono text-white">${money(data.totals.taxable_sales)}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Tax Collected</p>
            <p className="text-2xl font-mono text-white">${money(data.totals.tax_total)}</p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-xl p-5">
            <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-widest mb-2">Grand Total</p>
            <p className="text-2xl font-mono text-white">${money(data.totals.grand_total)}</p>
          </div>
        </div>
      )}

      {data && (
        <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            <div className="col-span-3">Reporting Code</div>
            <div className="col-span-3">County / City</div>
            <div className="col-span-2 text-right">Orders</div>
            <div className="col-span-2 text-right">Taxable Sales</div>
            <div className="col-span-2 text-right">Tax</div>
          </div>

          <div className="divide-y divide-white/5">
            {data.items.map((r) => (
              <div
                key={`${r.reporting_code}-${r.county ?? ""}-${r.city ?? ""}-${r.effective_date ?? ""}-${String(r.mctd_included)}`}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-white/[0.02] transition-colors items-center text-sm"
              >
                <div className="md:col-span-3 flex flex-col">
                  <div className="font-mono text-slate-200">{r.reporting_code}</div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-1">
                    {r.effective_date ?? "—"} · MCTD: {String(r.mctd_included)}
                  </div>
                </div>

                <div className="md:col-span-3 text-slate-300">
                  {(r.county ?? "—") + (r.city ? `, ${r.city}` : "")}
                </div>

                <div className="md:col-span-2 md:text-right font-mono text-slate-300">{r.orders_count}</div>

                <div className="md:col-span-2 md:text-right font-mono text-slate-200">
                  ${money(r.taxable_sales)}
                </div>

                <div className="md:col-span-2 md:text-right font-mono text-white">${money(r.tax_total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
