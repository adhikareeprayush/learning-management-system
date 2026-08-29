"use client";

import { useEffect, useState } from "react";
import ReactPlayer from "react-player";

type VideoPlayerProps = {
  url: string;
  title?: string;
};

export function VideoPlayer({ url, title }: VideoPlayerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-black shadow-[0_1px_2px_rgba(16,24,40,0.06)]">
      <div className="relative aspect-video w-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:size-full [&_video]:absolute [&_video]:inset-0 [&_video]:size-full">
        {mounted ? (
          <ReactPlayer
            src={url}
            width="100%"
            height="100%"
            controls
            playsInline
            style={{ position: "absolute", inset: 0 }}
            config={{
              youtube: {
                rel: 0,
                color: "white",
              },
            }}
            aria-label={title ?? "Lesson video"}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-white/70">
            Loading player…
          </div>
        )}
      </div>
    </div>
  );
}
