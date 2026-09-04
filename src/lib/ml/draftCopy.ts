import type { DraftAnalysis } from "@/lib/ml/types";

export const ADVANTAGE_COPY: Record<DraftAnalysis["advantage"], { headline: string; explanation: string; colorClass: string }> = {
  strong_red: {
    headline: "Strong Red Edge",
    explanation: "This draft scores well below the model's historical average — a strong lean toward Red.",
    colorClass: "text-red-side",
  },
  slight_red: {
    headline: "Slight Red Edge",
    explanation: "This draft scores somewhat below the model's historical average — a mild lean toward Red.",
    colorClass: "text-red-side",
  },
  even: {
    headline: "Roughly Even",
    explanation: "This draft lands near the model's historical average, with no clear edge either way.",
    colorClass: "text-text-primary",
  },
  slight_blue: {
    headline: "Slight Blue Edge",
    explanation: "This draft scores somewhat above the model's historical average — a mild lean toward Blue.",
    colorClass: "text-blue-side",
  },
  strong_blue: {
    headline: "Strong Blue Edge",
    explanation: "This draft scores well above the model's historical average — a strong lean toward Blue.",
    colorClass: "text-blue-side",
  },
};

export const CONFIDENCE_COPY: Record<DraftAnalysis["confidence"], { label: string; explanation: string }> = {
  low: {
    label: "Low",
    explanation: "The model's predictions were only weakly stable when tested against later patches.",
  },
  very_low: {
    label: "Very Low",
    explanation: "The model's predictions were only weakly stable when tested against later patches.",
  },
};

/** Static, human-written summary of the training data and its limits — replaces the
 * raw API `reference_population` / `disclaimer` strings, which carry internal
 * research-notes phrasing not meant for end users. */
export const MODEL_INFO_COPY = {
  trainingData:
    "Trained on ranked Solo/Duo matches from Challenger, Grandmaster, and Master players on NA1.",
  disclaimer: "This is a historical comparison, not a prediction of this game's outcome.",
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
