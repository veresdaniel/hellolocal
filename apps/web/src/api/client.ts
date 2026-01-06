// api/client.ts
const API_BASE = "/api";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}
