"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function Card({ children, className, hover = true, ...rest }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-2xl border border-border bg-card",
        "shadow-sm shadow-slate-900/5",
        "transition hover:shadow-lg hover:shadow-slate-900/10",
        hover && "hover:-translate-y-[1px]",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
