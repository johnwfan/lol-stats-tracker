import { getMatchById } from "@/lib/riot/riotClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "").toLowerCase();
    const matchId = searchParams.get("matchId") || "";

    if (!platform || !matchId) {
      return Response.json({ error: "Missing platform/matchId" }, { status: 400 });
    }

    const match = await getMatchById(platform, matchId);
    return Response.json({ platform, matchId, match });
  } catch (err) {
    return Response.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
