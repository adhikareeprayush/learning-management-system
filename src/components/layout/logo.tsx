import Link from "next/link";

type LogoProps = {
  className?: string;
  markClassName?: string;
  inverted?: boolean;
  markOnly?: boolean;
};

export function Logo({
  className = "",
  markClassName = "size-10",
  inverted = false,
  markOnly = false,
}: LogoProps) {
  const navy = inverted ? "#ffffff" : "#04016C";
  const teal = inverted ? "#4be5ca" : "#2AAA94";

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} navy={navy} teal={teal} />
      {markOnly ? (
        <span className="sr-only">Convolution LMS</span>
      ) : (
        <span
          className={`font-brand text-lg font-semibold leading-none tracking-tight sm:text-[22px] ${
            inverted ? "text-white" : "text-brand-navy"
          }`}
        >
          Convolution
          <span className={inverted ? "text-brand-mint" : "text-brand-teal"}>
            {" "}
            LMS
          </span>
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
