"use client";

import dynamic from "next/dynamic";

// Code-split react-player: it's only needed on the lesson page, so keep it out
// of the shared client bundle. ssr:false also avoids hydration mismatches.
const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center text-sm text-white/70">
      Loading player…
    </div>
  ),
});

type VideoPlayerProps = {
  url: string;
  title?: string;
  onEnded?: () => void;
};

export function VideoPlayer({ url, title, onEnded }: VideoPlayerProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-black shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="relative aspect-video w-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_video]:absolute [&_video]:inset-0 [&_video]:size-full">
        <ReactPlayer
          src={url}
          width="100%"
          height="100%"
          controls
          playsInline
          onEnded={onEnded}
          style={{ position: "absolute", inset: 0 }}
          config={{
            youtube: {
              rel: 0,
              color: "white",
            },
          }}
          aria-label={title ?? "Lesson video"}
        />
      </div>
    </div>
  );
}
