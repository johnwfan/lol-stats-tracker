"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import MatchListItem from "@/components/MatchListItem";

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

export default function MatchList({ matches }) {
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-text-primary">Recent Matches</div>
        <div className="text-xs text-text-muted">Last {matches.length}</div>
      </div>

      <motion.div variants={listVariants} initial="hidden" animate="show" className="mt-4 space-y-2">
        {matches.map((m) => (
          <motion.div key={m.matchId} variants={itemVariants}>
            <MatchListItem match={m} />
          </motion.div>
        ))}
      </motion.div>
    </Card>
  );
}
