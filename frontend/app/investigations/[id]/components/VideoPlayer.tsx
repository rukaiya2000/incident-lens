"use client";

import { forwardRef } from "react";

const VideoPlayer = forwardRef<HTMLVideoElement>(function VideoPlayer(_props, ref) {
  return (
    <video
      ref={ref}
      controls
      className="w-full rounded-lg border border-zinc-200 bg-black dark:border-zinc-800"
    />
  );
});

export default VideoPlayer;
