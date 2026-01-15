import { auth } from "@/auth";
import { dbConnect } from "@/lib/db";
import RecentSearch from "@/models/RecentSearch";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ items: [] }, { status: 200 });
  }

  await dbConnect();

  const items = await RecentSearch.find({ userEmail: email })
    .sort({ lastSearchedAt: -1 })
    .limit(10)
    .lean();

  return Response.json({ items }, { status: 200 });
}

export async function POST(req) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const platform = (body?.platform || "").toLowerCase();
  const name = (body?.name || "").trim();
  const tag = (body?.tag || "").trim();

  if (!platform || !name || !tag) {
    return Response.json({ error: "missing platform/name/tag" }, { status: 400 });
  }

  await dbConnect();

  // upsert: if it exists, just bump lastSearchedAt
  await RecentSearch.findOneAndUpdate(
    { userEmail: email, platform, name, tag },
    { $set: { lastSearchedAt: new Date() } },
    { upsert: true, new: true }
  );

  // keep only latest 10
  const overflow = await RecentSearch.find({ userEmail: email })
    .sort({ lastSearchedAt: -1 })
    .skip(10)
    .select({ _id: 1 })
    .lean();

  if (overflow.length) {
    await RecentSearch.deleteMany({ _id: { $in: overflow.map((d) => d._id) } });
  }

  return Response.json({ ok: true }, { status: 200 });
}
