import { cacheGet, cacheSet } from "@/lib/cache/cacheGetSet";
import { getTopChampionMasteries } from "@/lib/riot/riotClient";
import type { ChampionMasteryDto } from "@/lib/riot/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "").toLowerCase();
    const puuid = searchParams.get("puuid") || "";
    const count = Number(searchParams.get("count") || 5);

    if (!platform || !puuid) {
      return Response.json({ error: "Missing platform/puuid" }, { status: 400 });
    }

    const key = `mastery:${platform}:${puuid}:${count}`;
    const cached = await cacheGet<ChampionMasteryDto[]>(key);
    if (cached) return Response.json({ platform, puuid, masteries: cached, cached: true });

    const masteries = await getTopChampionMasteries(platform, puuid, count);
    await cacheSet(key, masteries, 60 * 60); // 1 hour

    return Response.json({ platform, puuid, masteries, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
