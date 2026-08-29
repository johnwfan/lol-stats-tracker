import { getMatchIdsByPuuid } from "@/lib/riot/riotClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "").toLowerCase();
    const puuid = searchParams.get("puuid") || "";
    const count = Number(searchParams.get("count") || 10);

    if (!platform || !puuid) {
      return Response.json({ error: "Missing platform/puuid" }, { status: 400 });
    }

    const matchIds = await getMatchIdsByPuuid(platform, puuid, count);
    return Response.json({ platform, puuid, count, matchIds });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
