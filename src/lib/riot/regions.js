export const PLATFORM_TO_REGIONAL = {
  br1: "americas",
  la1: "americas",
  la2: "americas",
  na1: "americas",

  eun1: "europe",
  euw1: "europe",
  tr1: "europe",
  ru: "europe",

  kr: "asia",
  jp1: "asia",

  oc1: "sea",
  sg2: "sea",
  tw2: "sea",
  vn2: "sea",
  th2: "sea",
  ph2: "sea",
};

export function regionalFromPlatform(platform) {
  const r = PLATFORM_TO_REGIONAL[platform];
  if (!r) throw new Error(`Unknown platform: ${platform}`);
  return r;
}
