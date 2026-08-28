"use client";

import { motion } from "framer-motion";
import Badge from "@/components/ui/Badge";
import HeroGraphic from "@/components/HeroGraphic";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
};

export default function Hero({ children }) {
  return (
    <section className="hero-band relative overflow-hidden px-4 pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block" aria-hidden="true">
        <HeroGraphic className="absolute right-[-6%] top-1/2 h-[480px] w-[480px] -translate-y-1/2 opacity-60 lg:h-[560px] lg:w-[560px] lg:opacity-70" />
      </div>

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
