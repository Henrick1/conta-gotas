const BASE = "https://api.pluggy.ai";

let cached: { key: string; expires: number } | null = null;

async function apiKey(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.key;
  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET não estão configurados");
  const res = await fetch(`${BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) throw new Error(`Pluggy auth falhou (${res.status}): ${await res.text()}`);
  const body = await res.json();
  cached = { key: body.apiKey, expires: Date.now() + 90 * 60 * 1000 };
  return body.apiKey;
}

export async function pluggy<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const key = await apiKey();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-API-KEY": key, ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`Pluggy ${init.method ?? "GET"} ${path} falhou (${res.status}): ${await res.text()}`);
  if (res.status === 204) return null as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
