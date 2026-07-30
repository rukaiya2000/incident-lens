"use client";

import { forwardRef } from "react";

const VideoPlayer = forwardRef<HTMLVideoElement, { src?: string }>(function VideoPlayer({ src }, ref) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm dark:border-zinc-800"><video ref={ref} src={src} controls className="aspect-video w-full bg-black" />{!src && <div className="grid aspect-video place-items-center p-6 text-center text-sm text-slate-400">Select an analyzed video to begin reviewing evidence.</div>}</div>;
});

export default VideoPlayer;