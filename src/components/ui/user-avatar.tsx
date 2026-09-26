"use client";

import { memo, useEffect, useState, useSyncExternalStore } from "react";
import { getInitials } from "@/components/dashboard/dashboard-user-context";

const sizes = {
  xs: 28,
  sm: 36,
  md: 40,
  lg: 96,
} as const;

const textSizes = {
  xs: "text-[11px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-2xl",
} as const;

/** Session-scoped cache so avatars do not flash on client navigations. */
const loadedAvatarUrls = new Set<string>();

function isAvatarLoaded(src: string) {
  return loadedAvatarUrls.has(src);
}

function markAvatarLoaded(src: string) {
  loadedAvatarUrls.add(src);
}

const noopSubscribe = () => () => {};

/** False while hydrating (matching the server HTML), true for later client renders. */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

type UserAvatarProps = {
  name: string;
  image?: string | null;
  size?: keyof typeof sizes;
  className?: string;
};

function UserAvatarComponent({
  name,
  image,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const px = sizes[size];
  const initials = getInitials(name);
  const imageSrc = image?.trim() || null;

  const hydrated = useHydrated();
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  // The cache only applies after hydration; the server always renders the photo hidden.
  const showPhoto =
    imageSrc !== null &&
    (loadedSrc === imageSrc || (hydrated && isAvatarLoaded(imageSrc)));

  // An <img> that finished before hydration never fires onLoad, so probe with a
  // detached Image; its load event is always dispatched, even from cache.
  useEffect(() => {
    if (!imageSrc || isAvatarLoaded(imageSrc)) return;
    const probe = new window.Image();
    probe.onload = () => {
      markAvatarLoaded(imageSrc);
      setLoadedSrc(imageSrc);
    };
    probe.src = imageSrc;
    return () => {
      probe.onload = null;
    };
  }, [imageSrc]);

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <span
        className={`absolute inset-0 grid place-items-center bg-brand-gradient font-bold text-white ${textSizes[size]}`}
      >
        {initials}
      </span>
      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt=""
          width={px}
          height={px}
          decoding="async"
          loading="eager"
          onLoad={() => {
            markAvatarLoaded(imageSrc);
            setLoadedSrc(imageSrc);
          }}
          className={`absolute inset-0 size-full object-cover ${
            showPhoto ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </span>
  );
}

export const UserAvatar = memo(UserAvatarComponent);
