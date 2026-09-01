"use client";

import { motion, type Variants } from "framer-motion";
import SearchForm from "@/components/SearchForm";
import SearchChips from "@/components/SearchChips";
import { championSplashUrl } from "@/lib/ddragon";
import { demoCollageChampion } from "@/lib/homepageDemoData";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function HeroPoster() {
  const splash = championSplashUrl(demoCollageChampion);

  return (
    <section className="relative overflow-hidden">
      {/* Champion art centered behind the hero at reduced opacity, fading to solid white toward the bottom so it blends into the section below on scroll. */}
      <div className="absolute inset-0">
        {splash ? (
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${splash})`,
              backgroundSize: "cover",
              backgroundPosition: "center 20%",
              backgroundRepeat: "no-repeat",
              opacity: 0.7,
            }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.4) 35%, rgba(255,255,255,0.85) 70%, #FFFFFF 100%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 md:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center py-16 text-center lg:min-h-[600px] lg:justify-center lg:py-20"
        >
          <div className="mx-auto w-full max-w-3xl">
            <motion.div
              variants={itemVariants}
              className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-hp-muted"
            >
              League of Legends Stats Tracker
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-3 w-full text-center font-display text-4xl font-black leading-[1.1] text-hp-ink sm:text-5xl lg:text-8xl"
            >
              SCUTTLE.GG
            </motion.h1>

            <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-md text-[1rem] text-hp-muted lg:text-lg">
              Search any Riot ID and get ranked, mastery, and match history.
            </motion.p>

            <motion.div variants={itemVariants} className="mx-auto mt-7 max-w-3xl space-y-3">
              <SearchForm variant="poster" />
              <SearchChips />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
