import Link from "next/link";
import { VideoPoster } from "@/components/video-poster";

type Video = {
  title: string;
  creator: string;
  channel: string;
  views: string;
  uploadedAt: string;
  duration: string;
  category: string;
  score: string;
  poster?: string;
  description: string;
};

function videoHref(title: string) {
  return `/watch?video=${encodeURIComponent(title)}`;
}

export function VideoCard({ video, compact = false }: { video: Video; compact?: boolean }) {
  if (compact) {
    return (
      <Link href={videoHref(video.title)} className="group grid grid-cols-[150px_1fr] gap-3 rounded-xl p-1 transition hover:bg-slate-100 active:scale-[0.99]">
        <VideoPoster kind={video.poster} duration={video.duration} className="aspect-video rounded-xl" />
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
    <Link href={videoHref(video.title)} className="group block rounded-xl bg-transparent transition hover:-translate-y-1">
      <VideoPoster kind={video.poster} duration={video.duration} label={video.category} className="aspect-video rounded-xl" />
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
