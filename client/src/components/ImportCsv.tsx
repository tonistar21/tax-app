import React from "react";
import { importOrdersCsv } from "../api";
import type { ImportResponse } from "../types";
import { UploadCloud, FileText, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export function ImportCsv() {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ImportResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onUpload() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await importOrdersCsv(file);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-[var(--font-serif)] tracking-tight text-white mb-4">Import Records</h2>
        <p className="text-slate-500 text-sm font-[var(--font-mono)] uppercase tracking-widest">Bulk Drone Delivery Import</p>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 md:p-12">
        <div className="mb-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex gap-4">
          <div className="mt-0.5 text-indigo-400">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-indigo-300">CSV Format Requirements</h3>
            <p className="text-sm text-indigo-200/70 mt-1.5 leading-relaxed">
              Upload a CSV file with the following columns:{" "}
              <code className="bg-indigo-500/20 px-2 py-1 rounded-md text-indigo-300 font-[var(--font-mono)] text-xs">
                id, longitude, latitude, timestamp, subtotal
              </code>
            </p>
          </div>
        </div>

        <div className="border border-dashed border-slate-700/70 rounded-2xl p-12 text-center hover:bg-white/[0.02] hover:border-slate-500 transition-all cursor-pointer group relative">
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="w-16 h-16 bg-white/[0.05] border border-white/10 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Click or drag file to this area</h3>
          <p className="text-slate-500 text-sm">CSV files only</p>
        </div>

        {file && (
          <div className="mt-6 p-4 bg-white/[0.02] rounded-xl border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/[0.05] rounded-lg">
                <FileText className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{file.name}</p>
                <p className="text-xs text-slate-500 font-[var(--font-mono)] mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
              onClick={onUpload}
              disabled={loading}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Process Import"}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">Import Results</h3>
              {result.failed === 0 ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> All rows imported
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" /> Imported with issues
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Batch ID</p>
                <p className="text-sm font-[var(--font-mono)] text-slate-300 truncate" title={result.import_batch_id}>
                  {result.import_batch_id}
                </p>
              </div>
              <div className="bg-white/[0.02] p-5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Total Rows</p>
                <p className="text-2xl font-[var(--font-mono)] text-white">{result.total_rows}</p>
              </div>
              <div className="bg-emerald-500/5 p-5 rounded-xl border border-emerald-500/10">
                <p className="text-[10px] text-emerald-500/70 font-semibold uppercase tracking-widest mb-2">Inserted</p>
                <p className="text-2xl font-[var(--font-mono)] text-emerald-400">{result.inserted}</p>
              </div>
              <div className={result.failed > 0 ? "bg-red-500/5 p-5 rounded-xl border border-red-500/10" : "bg-white/[0.02] p-5 rounded-xl border border-white/5"}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 ${result.failed > 0 ? "text-red-500/70" : "text-slate-500"}`}>
                  Failed
                </p>
                <p className={`text-2xl font-[var(--font-mono)] ${result.failed > 0 ? "text-red-400" : "text-white"}`}>{result.failed}</p>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="p-0">
              <div className="px-8 py-4 bg-white/[0.01] border-b border-white/5 flex justify-between items-center">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Error Details</h4>
                <span className="text-[10px] text-slate-500 font-[var(--font-mono)]">Showing first {result.errors.length}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-white/[0.02]">
                    <tr>
                      <th className="px-8 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Row</th>
                      <th className="px-8 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">External ID</th>
                      <th className="px-8 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {result.errors.map((er, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-8 py-3 whitespace-nowrap text-xs font-[var(--font-mono)] text-slate-400">{er.row}</td>
                        <td className="px-8 py-3 whitespace-nowrap text-xs font-[var(--font-mono)] text-slate-300">{er.external_id ?? "—"}</td>
                        <td className="px-8 py-3 text-xs text-red-400">{er.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
