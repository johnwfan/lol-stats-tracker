export const QUEUE_NAMES: Record<number, string> = {
  0: "Custom",
  400: "Normal Draft",
  430: "Normal Blind",
  440: "Ranked Flex",
  420: "Ranked Solo/Duo",
  450: "ARAM",
  490: "Quickplay",
  700: "Clash",
  830: "Co-op vs AI (Intro)",
  840: "Co-op vs AI (Beginner)",
  850: "Co-op vs AI (Intermediate)",
  900: "URF",
  1020: "One for All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
  1700: "Arena",
};

export function queueName(queueId: number): string {
  return QUEUE_NAMES[queueId] || `Queue ${queueId}`;
}
