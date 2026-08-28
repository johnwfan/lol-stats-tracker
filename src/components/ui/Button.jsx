import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  ghost: "border border-border bg-transparent text-text-primary hover:bg-overlay-hover",
  outline: "border border-accent/30 text-accent hover:bg-accent/10",
};

const SIZES = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-3 text-sm",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  className,
  href,
  ...rest
}) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    className
  );

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button disabled={disabled} className={classes} {...rest}>
      {children}
    </button>
  );
}
