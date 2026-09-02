import type { DraftAnalysis } from "@/lib/ml/types";

export const ADVANTAGE_COPY: Record<DraftAnalysis["advantage"], { headline: string; explanation: string; colorClass: string }> = {
  strong_red: {
    headline: "Strong Red Edge",
    explanation: "This draft falls well below the center of the model's historical score distribution, leaning strongly Red-favored.",
    colorClass: "text-red-side",
  },
  slight_red: {
    headline: "Slight Red Edge",
    explanation: "This draft falls somewhat below the center of the model's historical score distribution, leaning slightly Red-favored.",
    colorClass: "text-red-side",
  },
  even: {
    headline: "Roughly Even",
    explanation: "This draft falls near the center of the model's historical score distribution — neither side shows a clear historical edge.",
    colorClass: "text-text-primary",
  },
  slight_blue: {
    headline: "Slight Blue Edge",
    explanation: "This draft falls somewhat above the center of the model's historical score distribution, leaning slightly Blue-favored.",
    colorClass: "text-blue-side",
  },
  strong_blue: {
    headline: "Strong Blue Edge",
    explanation: "This draft falls well above the center of the model's historical score distribution, leaning strongly Blue-favored.",
    colorClass: "text-blue-side",
  },
};

export const CONFIDENCE_COPY: Record<DraftAnalysis["confidence"], { label: string; explanation: string }> = {
  low: {
    label: "Low",
    explanation: "Draft-only signals showed limited stability across future patches during evaluation.",
  },
  very_low: {
    label: "Very Low",
    explanation:
      "Draft-only signals showed limited stability across future patches during evaluation, and one or more champion-role picks in this draft had limited historical support.",
  },
};

export function ordinal(n: number): string {
  const rounded = Math.round(n);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1: return `${rounded}st`;
    case 2: return `${rounded}nd`;
    case 3: return `${rounded}rd`;
    default: return `${rounded}th`;
  }
}
