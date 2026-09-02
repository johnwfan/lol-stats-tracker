import { analyzeDraft } from "@/lib/ml/mlClient";
import type { DraftRequest } from "@/lib/ml/types";

const REQUIRED_FIELDS: (keyof DraftRequest)[] = [
  "blue_top", "blue_jungle", "blue_mid", "blue_adc", "blue_support",
  "red_top", "red_jungle", "red_mid", "red_adc", "red_support",
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Malformed JSON body" }, { status: 400 });
    }

    const missing = REQUIRED_FIELDS.filter((field) => typeof body[field] !== "string" || !body[field]);
    if (missing.length > 0) {
      return Response.json({ error: `Missing or invalid field(s): ${missing.join(", ")}` }, { status: 400 });
    }

    const draft = body as DraftRequest;
    const analysis = await analyzeDraft(draft);

    return Response.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    // The ML service's own validation errors (duplicate/unknown champion) surface as 400s from mlFetch's thrown Error.
    const status = message.startsWith("ML service error 400") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
