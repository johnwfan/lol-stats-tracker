import { cacheGet, cacheSet } from "@/lib/cache/cacheGetSet";
import { getMatchById } from "@/lib/riot/riotClient";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const platform = (searchParams.get("platform") || "").toLowerCase();
  const matchId = searchParams.get("matchId") || "";
  if (!platform || !matchId) return Response.json({ error: "Missing platform/matchId" }, { status: 400 });

  const key = `match:${platform}:${matchId}`;
  const cached = await cacheGet(key);
  if (cached) return Response.json({ platform, matchId, match: cached, cached: true });

  const match = await getMatchById(platform, matchId);
  await cacheSet(key, match, 60 * 60 * 24 * 7); // 7 days

  return Response.json({ platform, matchId, match, cached: false });
}
