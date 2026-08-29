import { getLeagueEntriesByPuuid } from "@/lib/riot/riotClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "").toLowerCase();
    const puuid = searchParams.get("puuid") || "";

    if (!platform || !puuid) {
      return Response.json({ error: "Missing platform/puuid" }, { status: 400 });
    }

    const entries = await getLeagueEntriesByPuuid(platform, puuid);

    return Response.json({
      platform,
      puuid,
      rankedStatus: entries.length === 0 ? "UNRANKED" : "RANKED",
      entries,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
