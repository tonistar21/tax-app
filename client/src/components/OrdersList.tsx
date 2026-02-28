import React from "react";
import { listOrders, getOrdersSummary, getOrdersAnalytics, exportOrdersCsv } from "../api";
import type { OrdersListResponse, OrderDto, OrdersSummary, OrdersAnalytics } from "../types";
import { Search, RefreshCw, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Filter, Download } from "lucide-react";
import { motion } from "framer-motion";

function t(v: string) {
  return v.trim();
}
function fmtMoney(n: number) {
  return n.toFixed(2);
}
function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
function isOutOfState(o: OrderDto) {
  return Number(o.composite_tax_rate) === 0 && (o.source === "out_of_state" || o.jurisdictions?.source === "out_of_state");
}

function FilterInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">{label}</label>
      <input
        className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-slate-200 py-1 outline-none transition-colors placeholder:text-slate-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function OrdersList() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [source, setSource] = React.useState("");
  const [county, setCounty] = React.useState("");
  const [city, setCity] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [minRate, setMinRate] = React.useState("");
  const [maxRate, setMaxRate] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<OrdersListResponse | null>(null);
  const [summary, setSummary] = React.useState<OrdersSummary | null>(null);
  const [analytics, setAnalytics] = React.useState<OrdersAnalytics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(pageSize),
      };

      if (t(source)) params.source = t(source);
      if (t(county)) params.county = t(county);
      if (t(city)) params.city = t(city);
      if (t(dateFrom)) params.dateFrom = t(dateFrom);
      if (t(dateTo)) params.dateTo = t(dateTo);
      if (t(minRate)) params.minRate = t(minRate);
      if (t(maxRate)) params.maxRate = t(maxRate);

      const q = t(searchQuery);
      if (q) {
        if (q.length > 20) params.importBatchId = q;
        else params.externalId = q;
      }

      const [list, sum] = await Promise.all([
        listOrders(params),
        getOrdersSummary(params),
      ]);

      setData(list);
      setSummary(sum);

      // analytics можно грузить один раз (или по кнопке), чтобы не спамить запросами
      if (!analytics) {
        const a = await getOrdersAnalytics();
        setAnalytics(a);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  function applyFilters() {
    setPage(1);
    load();
  }

  async function onExport() {
    try {
      const params: Record<string, string> = {};

      // ВАЖНО: экспорт делаем по ТЕКУЩИМ фильтрам (без page/pageSize)
      if (t(source)) params.source = t(source);
      if (t(county)) params.county = t(county);
      if (t(city)) params.city = t(city);
      if (t(dateFrom)) params.dateFrom = t(dateFrom);
      if (t(dateTo)) params.dateTo = t(dateTo);
      if (t(minRate)) params.minRate = t(minRate);
      if (t(maxRate)) params.maxRate = t(maxRate);

      const q = t(searchQuery);
      if (q) {
        if (q.length > 20) params.importBatchId = q;
        else params.externalId = q;
      }

      const { blob, filename } = await exportOrdersCsv(params);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-[var(--font-serif)] text-white tracking-tight">Tax Order Ledger</h1>
          <p className="text-sm text-slate-500 mt-2 font-[var(--font-mono)] uppercase tracking-widest">
            NY State Department of Delivery
          </p>
        </div>

        {summary && (
          <div className="flex gap-8 mt-6 md:mt-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Total Records</span>
              <span className="text-xl font-mono text-white leading-none">{summary.total}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-semibold mb-1">NY State</span>
              <span className="text-xl font-mono text-emerald-400 leading-none">{summary.ny_state}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-amber-500/70 uppercase tracking-widest font-semibold mb-1">Out of State</span>
              <span className="text-xl font-mono text-amber-400 leading-none">{summary.out_of_state}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <h2 className="text-xs font-medium text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter Parameters
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded text-xs font-medium hover:bg-indigo-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Execute Query
            </button>

            <button
              onClick={onExport}
              disabled={loading}
              className="bg-white/[0.04] text-slate-200 border border-white/10 px-4 py-1.5 rounded text-xs font-medium hover:bg-white/[0.07] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
          <FilterInput label="Search ID" value={searchQuery} onChange={setSearchQuery} placeholder="Ext or Batch ID" />
          <FilterInput label="Source" value={source} onChange={setSource} placeholder="e.g. pub718" />
          <FilterInput label="County" value={county} onChange={setCounty} placeholder="e.g. Queens" />
          <FilterInput label="City" value={city} onChange={setCity} placeholder="Optional" />
          <FilterInput label="Date From" value={dateFrom} onChange={setDateFrom} placeholder="YYYY-MM-DD" />
          <FilterInput label="Date To" value={dateTo} onChange={setDateTo} placeholder="YYYY-MM-DD" />
          <FilterInput label="Min Rate" value={minRate} onChange={setMinRate} placeholder="0.0" />
          <FilterInput label="Max Rate" value={maxRate} onChange={setMaxRate} placeholder="1.0" />
        </div>
      </div>

      {/* Analytics Cards */}
      {(summary || analytics) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Загальна виручка</p>
            <p className="text-2xl font-mono text-white">${(summary?.revenue_total ?? 0).toFixed(2)}</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Сума зібраного налогу</p>
            <p className="text-2xl font-mono text-white">${(summary?.tax_total ?? 0).toFixed(2)}</p>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Топ-3 округа з продаж</p>
            <div className="mt-2 space-y-2">
              {(analytics?.top_counties ?? []).length === 0 ? (
                <p className="text-xs text-slate-500">No data</p>
              ) : (
                analytics!.top_counties.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300 truncate">{c.county ?? "—"}</span>
                    <span className="font-mono text-slate-200">${c.subtotal.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* Table */}
      {data && (
        <div className="border border-white/5 rounded-xl overflow-hidden bg-white/[0.01]">
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            <div className="col-span-3">Record ID / Time</div>
            <div className="col-span-3">Jurisdiction</div>
            <div className="col-span-2 text-right">Subtotal</div>
            <div className="col-span-2 text-right">Tax (Rate)</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          <div className="divide-y divide-white/5">
            {data.items.map((o, index) => {
              const out = isOutOfState(o);
              const countyV = o.jurisdictions?.county ?? "—";
              const cityV = o.jurisdictions?.city ?? "—";

              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 hover:bg-white/[0.02] transition-colors items-center text-sm"
                >
                  <div className="md:col-span-3 flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-[var(--font-mono)] text-slate-200">{shortId(o.id)}</span>
                      {out ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] uppercase tracking-wider font-semibold">
                          Out
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[9px] uppercase tracking-wider font-semibold">
                          NY
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="truncate">{o.timestamp}</span>
                      {o.external_id && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          <span className="font-[var(--font-mono)] text-slate-400" title={o.external_id}>
                            Ext
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-3 flex flex-col">
                    <div className="text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span className="truncate">
                        {countyV}, {cityV}
                      </span>
                    </div>
                    <div className="text-[10px] font-[var(--font-mono)] text-slate-500 mt-1 uppercase tracking-wider">
                      {o.source ?? o.jurisdictions?.source ?? "—"}
                    </div>
                  </div>

                  <div className="md:col-span-2 md:text-right flex justify-between md:block">
                    <span className="md:hidden text-xs text-slate-500 uppercase tracking-wider">Subtotal</span>
                    <span className="font-[var(--font-mono)] text-slate-400">${fmtMoney(o.subtotal)}</span>
                  </div>

                  <div className="md:col-span-2 md:text-right flex justify-between md:block">
                    <span className="md:hidden text-xs text-slate-500 uppercase tracking-wider">Tax</span>
                    <div>
                      <div className="font-[var(--font-mono)] text-slate-300">${fmtMoney(o.tax_amount)}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-[var(--font-mono)]">{o.composite_tax_rate}</div>
                    </div>
                  </div>

                  <div className="md:col-span-2 md:text-right flex justify-between md:block items-center">
                    <span className="md:hidden text-xs text-slate-500 uppercase tracking-wider">Total</span>
                    <div className="flex items-center justify-end gap-3">
                      <span className="font-[var(--font-mono)] text-white font-medium">${fmtMoney(o.total_amount)}</span>

                      <details className="relative group/details">
                        <summary className="list-none cursor-pointer p-1 hover:bg-slate-800 rounded transition-colors">
                          <MoreHorizontal className="w-4 h-4 text-slate-500" />
                        </summary>
                        <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-10 hidden group-open/details:block">
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
                            <span className="text-[10px] font-medium text-white uppercase tracking-wider">Jurisdictions</span>
                          </div>
                          <pre className="text-[10px] text-slate-400 font-[var(--font-mono)] whitespace-pre-wrap">
                            {JSON.stringify(o.jurisdictions, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between p-4 border-t border-white/5 bg-white/[0.01] gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Rows</span>
              <select
                className="bg-transparent border-b border-slate-700 text-slate-300 text-sm py-0.5 focus:outline-none focus:border-indigo-500 font-[var(--font-mono)]"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n} className="bg-slate-900">
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-500 uppercase tracking-wider">
                Page <span className="text-white font-[var(--font-mono)]">{data.page}</span> /{" "}
                <span className="text-white font-[var(--font-mono)]">{totalPages || 1}</span>
              </span>

              <div className="flex gap-1">
                <button
                  className="p-1.5 rounded bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={loading || page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  className="p-1.5 rounded bg-white/[0.02] border border-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
                  disabled={loading || (totalPages ? page >= totalPages : false)}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {data?.items.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/[0.01] rounded-xl border border-white/5 border-dashed">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.02] mb-4">
            <Search className="w-5 h-5 text-slate-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-widest">No records found</h3>
          <p className="text-xs text-slate-500 mt-2">Adjust filter parameters to query again.</p>
        </div>
      )}
    </div>
  );
}
