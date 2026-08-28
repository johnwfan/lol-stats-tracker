// Small set of known mismatches between Riot names and DDragon filenames
export const CHAMPION_DDRAGON_EXCEPTIONS = {
  FiddleSticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
  KhaZix: "Khazix",
  ChoGath: "Chogath",
  LeBlanc: "Leblanc",
};

export function championToDdragonImageName(championName) {
  return CHAMPION_DDRAGON_EXCEPTIONS[championName] || championName;
}

export function championIconUrl(championName) {
  const champ = championToDdragonImageName(championName);
  if (!champ) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${champ}_0.jpg`;
}
