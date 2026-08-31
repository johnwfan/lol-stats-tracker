"use client";

import { motion, type Variants } from "framer-motion";
import { Trophy, Flame } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatRow from "@/components/ui/StatRow";
import { cn } from "@/lib/utils";
import type { LeagueEntryDto } from "@/lib/riot/types";
import type { RankedData } from "@/types/domain";

function rankedQueueName(queueType: string): string {
  const map: Record<string, string> = {
    RANKED_SOLO_5x5: "Ranked Solo/Duo",
    RANKED_FLEX_SR: "Ranked Flex",
    RANKED_FLEX_TT: "Ranked Flex (TT)", // legacy, rarely seen
  };
  return map[queueType] || queueType || "Ranked";
}

function formatTierRank(entry: LeagueEntryDto): string {
  if (!entry?.tier || !entry?.rank) return "Unranked";
  return `${entry.tier} ${entry.rank}`; // e.g. "GOLD II"
}

function winrate(wins: number, losses: number): string {
  const total = (wins || 0) + (losses || 0);
  if (total === 0) return "—";
  return `${Math.round((wins / total) * 100)}%`;
}

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

interface RankedCardProps {
  ranked: RankedData;
}

export default function RankedCard({ ranked }: RankedCardProps) {
  const hasEntries = ranked.entries && ranked.entries.length > 0 && ranked.rankedStatus !== "UNRANKED";

  return (
    <Card hover={false} className="p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
          <Trophy className="h-4 w-4 text-gold" />
          Ranked
        </div>
        <div className="text-xs text-text-muted">League-V4</div>
      </div>

      {!hasEntries ? (
        <div className="mt-3 rounded-xl border border-border bg-surface p-3 text-sm text-text-secondary">
          Unranked — play a ranked Solo/Duo or Flex match to populate this.
        </div>
      ) : (
        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="mt-4 grid gap-3 xl:grid-cols-2"
        >
          {ranked.entries
            .slice()
            .sort((a, b) => (a.queueType || "").localeCompare(b.queueType || ""))
            .map((e) => {
              const isSolo = e.queueType === "RANKED_SOLO_5x5";
              const accent = isSolo ? "border-gold/30" : "border-border";

              return (
                <motion.div
                  key={e.queueType}
                  variants={itemVariants}
                  className={cn(
                    "rounded-2xl border bg-surface p-4",
                    "transition hover:bg-overlay-hover hover:shadow-[0_10px_15px_-3px_var(--color-shadow)]",
                    accent
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-text-secondary">{rankedQueueName(e.queueType)}</div>
                      <div className="mt-1 text-xl font-semibold tracking-tight text-text-primary">
                        {formatTierRank(e)}
                        <span className="ml-2 text-sm font-medium text-text-secondary">
                          {e.leaguePoints ?? 0} LP
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={e.hotStreak ? "coral" : isSolo ? "gold" : "default"}>
                        {e.hotStreak ? (
                          <>
                            <Flame className="h-3.5 w-3.5" /> Hot Streak
                          </>
                        ) : e.veteran ? (
                          "Veteran"
                        ) : e.freshBlood ? (
                          "Fresh Blood"
                        ) : (
                          "Ranked"
                        )}
                      </Badge>
                      {e.inactive ? <Badge tone="gold">Inactive</Badge> : null}
                    </div>
                  </div>

                  <StatRow
                    className="mt-3"
                    items={[
                      { label: "Wins", value: e.wins ?? 0 },
                      { label: "Losses", value: e.losses ?? 0 },
                      { label: "Winrate", value: winrate(e.wins, e.losses) },
                    ]}
                  />
                </motion.div>
              );
            })}
        </motion.div>
      )}
    </Card>
  );
}
