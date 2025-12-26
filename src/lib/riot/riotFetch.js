function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function riotFetch(url) {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("Missing RIOT_API_KEY in .env.local");

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: { "X-Riot-Token": apiKey },
      next: { revalidate: 0 },
    });

    if (res.ok) return res.json();

    if (res.status === 429 || (res.status >= 500 && res.status <= 599)) {
      const retryAfter = res.headers.get("retry-after");
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : 250 * (attempt + 1);
      await sleep(waitMs);
      lastErr = new Error(`Riot error ${res.status}`);
      continue;
    }

    const text = await res.text();
    throw new Error(`Riot error ${res.status}: ${text}`);
  }

  throw lastErr || new Error("Riot request failed");
}
