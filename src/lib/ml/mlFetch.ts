/**
 * Thin fetch wrapper for the ML inference service, mirroring
 * src/lib/riot/riotFetch.ts's shape. No retry/backoff here -- unlike the
 * Riot API, this is a same-machine service with no external rate limits,
 * so a failure is just a failure to surface, not something to retry.
 *
 * A deployed ML service can be slow to respond (e.g. a free-tier host
 * waking from an idle spin-down), so this caps the wait instead of letting
 * the request hang until the platform's own timeout -- callers already
 * treat any thrown error the same way (a friendly "temporarily
 * unavailable" message), so a timeout just needs to fail, not fail fast in
 * any special way.
 */
export async function mlFetch<T = unknown>(path: string, body: unknown): Promise<T> {
  const baseUrl = process.env.ML_API_URL;
  if (!baseUrl) throw new Error("Missing ML_API_URL in .env.local");

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
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
