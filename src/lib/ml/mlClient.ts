import { mlFetch } from "@/lib/ml/mlFetch";
import type { DraftAnalysis, DraftRequest } from "@/lib/ml/types";

export async function analyzeDraft(draft: DraftRequest): Promise<DraftAnalysis> {
  return mlFetch<DraftAnalysis>("/analyze-draft", draft);
}
