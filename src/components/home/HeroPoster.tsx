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
      {/* Champion art bleeding in from the right, masked white-to-image left-to-right. Desktop only — too cramped to read well on narrow viewports.
          Note: the hero is proportionally much wider than the splash art (container ~2.4:1 vs image ~1.7:1), so a plain object-fit:cover <img> has
          zero horizontal slack to reposition within — it always ends up scaled to exactly the container's width with nothing left to crop. Using an
          oversized background-size instead deliberately zooms in, creating real slack so backgroundPosition can meaningfully shift the crop. */}
      <div className="absolute inset-0 hidden lg:block">
        {splash ? (
          <div
            aria-hidden="true"
            className="h-full w-full"
            style={{
              backgroundImage: `url(${splash})`,
              backgroundSize: "150% auto",
              backgroundPosition: "30% 10%",
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #FFFFFF 0px, #FFFFFF 760px, rgba(255,255,255,0.75) 940px, rgba(255,255,255,0.15) 1100px, rgba(255,255,255,0) 1250px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 md:px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="py-12 lg:flex lg:min-h-[600px] lg:flex-col lg:justify-center lg:py-20"
        >
          <div className="max-w-xl">
            <motion.div
              variants={itemVariants}
              className="text-[11px] font-medium uppercase tracking-[0.14em] text-hp-muted"
            >
              League of Legends Stats Tracker
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-3 font-display text-[clamp(2.75rem,13vw,4rem)] leading-[0.9] tracking-wide text-hp-ink sm:text-[76px] lg:text-[104px]"
            >
              SCUTTLE.GG
            </motion.h1>

            <motion.p variants={itemVariants} className="mt-4 max-w-md text-[1rem] text-hp-muted lg:text-lg">
              Search any Riot ID for ranked stats, mastery, and match history.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-7 max-w-lg space-y-3">
              <SearchForm variant="poster" />
              <SearchChips />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
