"use client";

import { forwardRef } from "react";

const VideoPlayer = forwardRef<HTMLVideoElement, { src?: string }>(function VideoPlayer({ src }, ref) {
  return <video ref={ref} src={src} controls className="aspect-video w-full rounded-[1.5rem] border border-white/10 bg-black shadow-2xl shadow-slate-950/25" />;
});

export default VideoPlayer;