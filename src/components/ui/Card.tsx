"use client";

import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className, hover = true, ...rest }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-2xl border border-border bg-card",
        "shadow-[0_1px_2px_0_var(--color-shadow)]",
        hover && "transition hover:-translate-y-[1px] hover:shadow-[0_10px_15px_-3px_var(--color-shadow)]",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
