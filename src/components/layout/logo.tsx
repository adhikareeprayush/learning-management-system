import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  className?: string;
  markClassName?: string;
  inverted?: boolean;
  markOnly?: boolean;
  /** Institute name; the last word takes the accent colour. */
  name?: string;
  /** Institute logo, shown in place of the default mark. */
  logoUrl?: string | null;
  /** Size / max-width classes for the name text. */
  textClassName?: string;
};

const DEFAULT_NAME = "Convolution LMS";

function splitName(name: string) {
  const trimmed = name.trim() || DEFAULT_NAME;
  const index = trimmed.lastIndexOf(" ");
  return index > 0
    ? { lead: trimmed.slice(0, index), accent: trimmed.slice(index) }
    : { lead: trimmed, accent: "" };
}

export function Logo({
  className = "",
  markClassName = "size-10",
  inverted = false,
  markOnly = false,
  name = DEFAULT_NAME,
  logoUrl = null,
  textClassName = "max-w-[55vw] text-lg sm:max-w-xs sm:text-[22px]",
}: LogoProps) {
  const navy = inverted ? "#ffffff" : "#04016C";
  const teal = inverted ? "#4be5ca" : "#2AAA94";
  const { lead, accent } = splitName(name);

  return (
    <Link
      href="/"
      className={`inline-flex min-w-0 max-w-full items-center gap-2.5 ${className}`}
    >
      {logoUrl ? (
        // Unoptimized: the logo may sit on a custom ImageKit domain that the
        // optimizer's remotePatterns don't list.
        <Image
          src={logoUrl}
          alt=""
          width={40}
          height={40}
          unoptimized
          className={`shrink-0 object-contain ${markClassName}`}
        />
      ) : (
        <LogoMark className={`shrink-0 ${markClassName}`} navy={navy} teal={teal} />
      )}
      {markOnly ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span
          title={name}
          className={`min-w-0 truncate font-brand font-semibold leading-none tracking-tight ${textClassName} ${
            inverted ? "text-white" : "text-brand-navy"
          }`}
        >
          {lead}
          {accent ? (
            <span className={inverted ? "text-brand-mint" : "text-brand-teal"}>
              {accent}
            </span>
          ) : null}
        </span>
      )}
    </Link>
  );
}

/**
 * Convolution LMS mark — a stylised feed-forward network (3 → 2 nodes)
 * evoking a convolution/neural layer. Colours are parameterised so the same
 * paths render on light and dark surfaces and inside certificates.
 */
function LogoMark({
  className,
  navy,
  teal,
}: {
  className?: string;
  navy: string;
  teal: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g stroke={teal} strokeWidth="1.6" opacity="0.4">
        <line x1="11" y1="11" x2="37" y2="17.5" />
        <line x1="11" y1="11" x2="37" y2="30.5" />
        <line x1="11" y1="24" x2="37" y2="17.5" />
        <line x1="11" y1="24" x2="37" y2="30.5" />
        <line x1="11" y1="37" x2="37" y2="17.5" />
        <line x1="11" y1="37" x2="37" y2="30.5" />
      </g>
      <circle cx="11" cy="11" r="4" fill={navy} />
      <circle cx="11" cy="24" r="4" fill={navy} />
      <circle cx="11" cy="37" r="4" fill={navy} />
      <circle cx="37" cy="17.5" r="4.5" fill={teal} />
      <circle cx="37" cy="30.5" r="4.5" fill={teal} />
    </svg>
  );
}
