/**
 * Thin fetch wrapper for the ML inference service, mirroring
 * src/lib/riot/riotFetch.ts's shape. No retry/backoff here -- unlike the
 * Riot API, this is a same-machine service with no external rate limits,
 * so a failure is just a failure to surface, not something to retry.
 */
export async function mlFetch<T = unknown>(path: string, body: unknown): Promise<T> {
  const baseUrl = process.env.ML_API_URL;
  if (!baseUrl) throw new Error("Missing ML_API_URL in .env.local");

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (res.ok) return res.json();

  const bodyText = await res.text().catch(() => "");
  const detail = (() => {
    try {
      return JSON.parse(bodyText)?.detail ?? bodyText;
    } catch {
      return bodyText;
    }
  })();
  throw new Error(`ML service error ${res.status}: ${JSON.stringify(detail)}`);
}
