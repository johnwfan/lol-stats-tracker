import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-accent text-[color:var(--color-base)] hover:bg-accent-hover",
  ghost: "border border-border bg-transparent text-text-primary hover:bg-overlay-hover",
  outline: "border border-accent/30 text-accent hover:bg-accent/10",
} as const;

const SIZES = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-sm",
} as const;

interface CommonProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export default function Button({ children, variant = "primary", size = "md", className, href, ...rest }: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
