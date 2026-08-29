"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import Badge from "@/components/ui/Badge";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

interface HeroProps {
  children: ReactNode;
}

export default function Hero({ children }: HeroProps) {
  return (
    <section className="hero-band relative overflow-hidden px-4 pt-20 pb-16 md:pt-28 md:pb-24">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <motion.div variants={itemVariants}>
            <Badge tone="accent">League of Legends Stats Tracker</Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl md:text-6xl"
          >
            Scuttle your way to better stats.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-base text-text-secondary md:text-lg">
            Search any Riot ID to pull ranked progress, live profile info, and full match history.
          </motion.p>
        </div>

        <motion.div variants={itemVariants} className="mx-auto mt-6 max-w-3xl space-y-3">
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}
