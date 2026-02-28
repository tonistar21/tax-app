import React from "react";
import { login, setToken } from "../api";
import { Lock, Loader2, ShieldCheck } from "lucide-react";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("betterme2026");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await login(username.trim(), password);
      setToken(r.token);
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B101E] text-slate-300 flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-white/[0.02] border border-white/5 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-[var(--font-serif)] text-white">Tax App Admin</h1>
            <p className="text-xs text-slate-500 font-[var(--font-mono)] uppercase tracking-widest mt-1">
              Secure Dashboard Access
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Username</label>
            <input
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-white py-2 outline-none transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Password</label>
            <input
              type="password"
              className="w-full bg-transparent border-b border-slate-700/50 focus:border-indigo-400 text-sm text-white py-2 outline-none transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-[10px] text-slate-500 font-[var(--font-mono)] uppercase tracking-widest text-center">
            Default: admin / betterme2026
          </p>
        </form>
      </div>
    </div>
  );
}
