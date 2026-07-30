"use client";

import { forwardRef } from "react";

const VideoPlayer = forwardRef<HTMLVideoElement>(function VideoPlayer(_props, ref) {
  return (
    <video
      ref={ref}
      controls
      className="aspect-video w-full rounded-xl border border-[var(--border)] bg-black shadow-sm"
    />
  );
});

export default VideoPlayer;
