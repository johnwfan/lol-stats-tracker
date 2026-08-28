"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export default function Avatar({ src, name, size = "sm", className }) {
  const [imgError, setImgError] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={cn("rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-accent/20 font-bold text-accent",
        SIZES[size],
        className
      )}
    >
      {initial}
    </span>
  );
}
