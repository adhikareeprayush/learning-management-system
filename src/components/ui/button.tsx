import { Loader2 } from "lucide-react";
import Link from "next/link";

type ButtonProps = {
  href?: string;
  children: React.ReactNode;
  /** primary = gradient; secondary = bordered white on light; white = solid white on dark; outline = ghost on dark; mint = mint fill */
  variant?: "primary" | "secondary" | "outline" | "white" | "mint" | "ghost";
  className?: string;
  type?: "button" | "submit";
  submit?: boolean;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * Each variant owns both background and text color.
 * Do not override bg-* / text-* via className — that causes Tailwind conflicts
 * (e.g. white text on white, or navy on navy).
 */
const variants = {
  primary:
    "border border-transparent bg-brand-gradient text-white shadow-md shadow-brand-purple/20 hover:brightness-110",
  secondary:
    "border border-black/10 bg-white text-brand-navy hover:bg-surface",
  white:
    "border border-transparent bg-white text-brand-navy hover:bg-white/90",
  outline:
    "border-2 border-white/45 bg-transparent text-white hover:bg-white/10",
  mint:
    "border border-transparent bg-brand-mint text-[#0b0a2e] hover:bg-brand-mint/90",
  ghost:
    "border border-transparent bg-transparent text-white hover:text-brand-mint",
};

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
  submit = false,
  onClick,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-[15px] font-semibold tracking-wide transition ${variants[variant]} ${className}`;
  const buttonClasses = `${classes} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={submit ? "submit" : type}
      className={buttonClasses}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
      {disabled ? <Loader2 className="size-4 animate-spin" /> : null}
    </button>
  );
}
