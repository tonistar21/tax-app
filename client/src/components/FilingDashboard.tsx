import React from "react";
import type { FilingSummaryResponse, FilingRow } from "../types";
import { downloadFilingCsv, downloadSt100Pdf, getFilingSummary } from "../api";
import { FileDown, FileText, RefreshCw, Filter, Download } from "lucide-react";
import { motion } from "framer-motion";

function money(n: number) {
  return n.toFixed(2);
}

function place(r: FilingRow) {
  const parts = [r.county, r.city].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function FilingDashboard() {
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<FilingSummaryResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (dateFrom.trim()) params.dateFrom = dateFrom.trim();
      if (dateTo.trim()) params.dateTo = dateTo.trim();

      const r = await getFilingSummary(params);
      setData(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function onDownloadCsv() {
    if (!data) return;
    const params: Record<string, string> = {};
    if (dateFrom.trim()) params.dateFrom = dateFrom.trim();
    if (dateTo.trim()) params.dateTo = dateTo.trim();

    const blob = await downloadFilingCsv(params);
    saveBlob(blob, "jurisdiction_summary.csv");
  }

  async function onDownloadPdf() {
    const params: Record<string, string> = {};
    if (dateFrom.trim()) params.dateFrom = dateFrom.trim();
    if (dateTo.trim()) params.dateTo = dateTo.trim();

    const blob = await downloadSt100Pdf(params);
    saveBlob(blob, "st100_filled.pdf");
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-[var(--font-serif)] text-white tracking-tight">Tax Filing</h1>
          <p className="text-sm text-slate-500 mt-2 font-[var(--font-mono)] uppercase tracking-widest">
            Jurisdiction Summary (Reporting Code)
          </p>
        </div>

        {data && (
          <div className="flex gap-8 mt-6 md:mt-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Jurisdictions</span>
              <span className="text-xl font-mono text-white leading-none">{data.totals.jurisdictions_count}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Taxable Sales</span>
              <span className="text-xl font-mono text-white leading-none">${money(data.totals.taxable_sales)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Tax Collected</span>
              <span className="text-xl font-mono text-emerald-400 leading-none">${money(data.totals.tax_collected)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4" /> Period
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadCsv}
              disabled={!data || loading}
              className="bg-white/[0.03] text-slate-200 border border-white/10 px-3 py-1.5 rounded text-xs font-medium hover:bg-white/[0.07] transition-colors flex items-center gap-2 disabled:opacity-40"
              title="Download jurisdiction summary CSV"
            >
              <FileDown className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              onClick={onDownloadPdf}
              disabled={loading}
              className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-40"
              title="Download ST-100 filled PDF (with appendix)"
            >
              <FileText className="w-3.5 h-3.5" />
              ST-100 PDF
            </button>

            <button
              onClick={load}
              disabled={loading}
              className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded text-xs font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Date From</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-slate-200 py-1 outline-none transition-colors placeholder:text-slate-700"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Date To</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-slate-200 py-1 outline-none transition-colors placeholder:text-slate-700"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={load}
              disabled={loading}
              className="w-full bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2 text-sm py-2.5"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Apply Period
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Table */}
      {data && (
        <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            <div className="col-span-2">Reporting Code</div>
            <div className="col-span-5">County / City</div>
            <div className="col-span-3 text-right">Taxable Sales</div>
            <div className="col-span-2 text-right">Tax Collected</div>
          </div>

          <div className="divide-y divide-white/5">
            {data.rows.map((r, idx) => (
              <motion.div
                key={`${r.reporting_code}-${r.county ?? ""}-${r.city ?? ""}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: idx * 0.01 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-white/[0.02] transition-colors items-center text-sm"
              >
                <div className="md:col-span-2">
                  <div className="font-mono text-slate-200">{r.reporting_code}</div>
                </div>

                <div className="md:col-span-5">
                  <div className="text-slate-300">{place(r)}</div>
                </div>

                <div className="md:col-span-3 md:text-right flex justify-between md:block">
                  <span className="md:hidden text-xs text-slate-500 uppercase tracking-wider">Taxable Sales</span>
                  <span className="font-mono text-white">${money(r.taxable_sales)}</span>
                </div>

                <div className="md:col-span-2 md:text-right flex justify-between md:block">
                  <span className="md:hidden text-xs text-slate-500 uppercase tracking-wider">Tax</span>
                  <span className="font-mono text-emerald-300">${money(r.tax_collected)}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="p-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono uppercase tracking-widest">
              Totals
            </span>
            <div className="flex gap-6">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Taxable Sales</div>
                <div className="font-mono text-white">${money(data.totals.taxable_sales)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Tax Collected</div>
                <div className="font-mono text-emerald-300">${money(data.totals.tax_collected)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-center py-20 bg-white/[0.01] rounded-xl border border-white/5 border-dashed">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-widest">No data</h3>
          <p className="text-xs text-slate-500 mt-2">Load filing summary to begin.</p>
        </div>
      )}
    </div>
  );
}
