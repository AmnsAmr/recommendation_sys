"use client";

import Link from "next/link";
import { VideoPoster } from "@/components/video-poster";
import type { UiVideo } from "@/lib/video-mapper";

function videoHref(video: UiVideo) {
  return `/watch?video=${encodeURIComponent(video.id || video.title)}`;
}

export function VideoCard({ video, compact = false }: { video: UiVideo; compact?: boolean }) {
  const rememberVideo = () => {
    window.localStorage.setItem("videorec-current-video", JSON.stringify(video));
  };

  if (compact) {
    return (
      <Link onClick={rememberVideo} href={videoHref(video)} className="group grid grid-cols-[150px_1fr] gap-3 rounded-xl p-1 transition hover:bg-slate-100 active:scale-[0.99]">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt="" className="aspect-video rounded-xl object-cover" />
        ) : (
          <VideoPoster kind={video.poster} duration={video.duration} className="aspect-video rounded-xl" />
        )}
        <div className="min-w-0 py-1">
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-950">
            {video.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500">{video.channel}</p>
          <p className="mt-1 text-xs text-slate-500">
            {video.views} views
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link onClick={rememberVideo} href={videoHref(video)} className="group block rounded-xl bg-transparent transition hover:-translate-y-1">
      {video.thumbnailUrl ? (
        <div className="relative overflow-hidden rounded-xl">
          <img src={video.thumbnailUrl} alt="" className="aspect-video w-full object-cover transition group-hover:scale-[1.02]" />
          <span className="absolute bottom-2 right-2 rounded-md bg-slate-950/85 px-2 py-1 text-xs font-bold text-white">{video.duration}</span>
          <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-bold text-slate-900">{video.category}</span>
        </div>
      ) : (
        <VideoPoster kind={video.poster} duration={video.duration} label={video.category} className="aspect-video rounded-xl" />
      )}
      <div className="mt-3 flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white transition group-hover:bg-teal-700">
          {video.creator.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-5 text-slate-950">
            {video.title}
          </h3>
          <p className="mt-1 truncate text-sm text-slate-600">{video.channel}</p>
          <p className="mt-1 text-xs text-slate-500">
            {video.views} views - {video.uploadedAt} - {video.score} match
          </p>
        </div>
      </div>
    </Link>
  );
}
