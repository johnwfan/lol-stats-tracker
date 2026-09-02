"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Card from "@/components/ui/Card";
import MatchListItem from "@/components/MatchListItem";
import type { MatchSummary } from "@/types/domain";

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

interface MatchListProps {
  matches: MatchSummary[];
  ddVersion: string | null;
}

export default function MatchList({ matches, ddVersion }: MatchListProps) {
  const reduceMotion = useReducedMotion();

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-text-primary">Recent Matches</div>
        <div className="text-xs text-text-muted">Last {matches.length}</div>
      </div>

      <motion.div
        variants={listVariants}
        initial={reduceMotion ? "show" : "hidden"}
        animate="show"
        className="mt-4 space-y-2"
      >
        {matches.map((m) => (
          <motion.div key={m.matchId} variants={itemVariants}>
            <MatchListItem match={m} ddVersion={ddVersion} />
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}
