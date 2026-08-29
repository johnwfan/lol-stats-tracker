import { dbConnect } from "@/lib/db";
import Summoner from "@/models/Summoner";
import { getAccountByRiotId, getSummonerByPuuid } from "@/lib/riot/riotClient";
import { regionalFromPlatform } from "@/lib/riot/regions";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "").toLowerCase();
    const name = searchParams.get("name") || "";
    const tag = searchParams.get("tag") || "";

    if (!platform || !name || !tag) {
      return Response.json({ error: "Missing platform/name/tag" }, { status: 400 });
    }

    await dbConnect();

    const acct = await getAccountByRiotId(platform, name, tag);

    const sum = await getSummonerByPuuid(platform, acct.puuid);

    const doc = await Summoner.findOneAndUpdate(
      { platform, puuid: acct.puuid },
      {
        platform,
        puuid: acct.puuid,
        summonerId: sum.id,
        name,
        tag,
        profileIconId: sum.profileIconId,
        summonerLevel: sum.summonerLevel,
        lastFetchedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return Response.json({
      platform,
      regional: regionalFromPlatform(platform),
      puuid: doc.puuid,
      summonerId: doc.summonerId,
      name: doc.name,
      tag: doc.tag,
      profileIconId: doc.profileIconId,
      summonerLevel: doc.summonerLevel,
      lastFetchedAt: doc.lastFetchedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    if (message.startsWith("Riot error 404")) {
      return Response.json({ error: "Summoner not found" }, { status: 404 });
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
