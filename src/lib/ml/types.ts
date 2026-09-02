export interface DraftRequest {
  blue_top: string;
  blue_jungle: string;
  blue_mid: string;
  blue_adc: string;
  blue_support: string;
  red_top: string;
  red_jungle: string;
  red_mid: string;
  red_adc: string;
  red_support: string;
}

export type DraftAdvantage = "strong_red" | "slight_red" | "even" | "slight_blue" | "strong_blue";

export type DraftConfidence = "low" | "very_low";

export interface DraftAnalysis {
  raw_score: number;
  z_score: number;
  percentile: number;
  advantage: DraftAdvantage;
  confidence: DraftConfidence;
  warnings: string[];
  model_version: string;
  reference_population: string;
  disclaimer: string;
}
