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
      <svg
        viewBox="0 0 54 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={markClassName}
        aria-hidden
      >
        <path
          d="M24.46 31.33H1.34C.6 31.33 0 31.94 0 32.67v11.64c0 .73.52 1.63 1.16 2L18.2 56.13l6.45 3.72c.64.37 1.16.07 1.16-.67V32.68c0-.74-.6-1.35-1.35-1.35Z"
          fill={teal}
        />
        <path
          d="M24.65.16 1.16 13.69C.52 14.06 0 14.96 0 15.69v11.64c0 .73.6 1.33 1.34 1.33h23.13c.74 0 1.34-.6 1.34-1.33V.82c0-.73-.52-1.02-1.16-.66Z"
          fill={navy}
        />
        <path
          d="M53.13 13.69 29.64.16c-.64-.37-1.16-.07-1.16.67v26.5c0 .73.6 1.33 1.34 1.33h23.13c.74 0 1.34-.6 1.34-1.33v-11.64c0-.73-.52-1.63-1.16-2Z"
          fill={teal}
        />
        <path
          d="M52.95 31.33H29.82c-.74 0-1.34.6-1.34 1.34v26.5c0 .74.52 1.04 1.16.67l23.49-13.53c.64-.37 1.16-1.11 1.16-1.74V32.67c0-.74-.6-1.34-1.34-1.34Z"
          fill={navy}
        />
        <circle cx="10.2" cy="40.9" r="1.4" fill={teal} />
        <circle cx="40.5" cy="18.3" r="5.2" fill={teal} opacity="0.85" />
      </svg>
      {markOnly ? (
        <span className="sr-only">Edujarr</span>
      ) : (
        <span
          className={`font-brand text-[22px] leading-none ${
            inverted ? "text-white" : "text-brand-navy"
          }`}
        >
          Edu
          <span className={inverted ? "text-brand-mint" : "text-brand-teal"}>
            jarr
          </span>
        </span>
      )}
    </Link>
  );
}
