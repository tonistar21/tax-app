const API_BASE = "/api"; // через Vite proxy

const TOKEN_KEY = "tax_app_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function readErrorText(res: Response) {
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (ct.includes("text/html") || text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
    return `API returned HTML instead of JSON. Check Vite proxy or API URL. (status ${res.status})`;
  }

  try {
    const j = JSON.parse(text);
    return j?.message || j?.error || JSON.stringify(j);
  } catch {
    return text || `Request failed (status ${res.status})`;
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Accept: "application/json",
      ...authHeaders(),
    },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(await readErrorText(res));
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const t = await res.text();
    throw new Error(`Expected JSON, got: ${ct}. Body starts: ${t.slice(0, 80)}`);
  }

  return res.json();
}

export async function login(username: string, password: string) {
  return fetchJson<{ token: string }>(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export async function me() {
  return fetchJson<any>(`/auth/me`);
}

export async function listOrders(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  return fetchJson<any>(`/orders?${usp.toString()}`);
}

export async function importOrdersCsv(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name);

  const res = await fetch(`${API_BASE}/orders/import`, {
    method: "POST",
    headers: {
      ...authHeaders(),
    },
    body: fd,
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }

  if (!res.ok) throw new Error(await readErrorText(res));
  return res.json();
}

export async function createOrder(payload: any) {
  return fetchJson<any>(`/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getOrdersSummary(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  return fetchJson<any>(`/orders/summary?${usp.toString()}`);
}

export async function getOrdersAnalytics() {
  return fetchJson<any>(`/orders/analytics`);
}

export async function exportOrdersCsv(params: Record<string, string>) {
  const usp = new URLSearchParams(params);

  const res = await fetch(`${API_BASE}/orders/export?${usp.toString()}`, {
    headers: { 
      Accept: "text/csv",
      ...authHeaders(),
    },
  });

  if (res.status === 401) {
    clearToken();
    throw new Error("Unauthorized");
  }

  if (!res.ok) throw new Error(await readErrorText(res));

  const blob = await res.blob();
  
  const cd = res.headers.get("content-disposition") || "";
  const m = cd.match(/filename="([^"]+)"/);
  const filename = m?.[1] ?? "orders_report.csv";

  return { blob, filename };
}

export async function getFilingSummary(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  return fetchJson<any>(`/orders/filing/summary?${usp.toString()}`);
}

export async function downloadFilingCsv(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/orders/filing/export.csv?${usp.toString()}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await readErrorText(res));
  return res.blob();
}

export async function downloadSt100Pdf(params: Record<string, string>) {
  const usp = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/orders/filing/st100.pdf?${usp.toString()}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(await readErrorText(res));
  return res.blob();
}
