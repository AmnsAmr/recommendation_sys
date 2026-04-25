"use client";

import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { categories, videos } from "@/lib/mock-data";

export default function HomepagePage() {
  const [active, setActive] = useState("For you");
  const visibleVideos = active === "For you" ? videos : videos.filter((video) => video.category === active);

  return (
    <AppShell>
      <div className="sticky top-16 z-30 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActive(category)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold transition ${
                active === category
                  ? "bg-slate-950 text-white"
                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950">{active === "For you" ? "Recommended" : active}</h1>
            <p className="mt-1 text-sm text-slate-500">Watch videos with large thumbnails, just like a video platform.</p>
          </div>
        </div>

        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
          {visibleVideos.map((video, index) => (
            <div key={video.title} className="animate-in" style={{ animationDelay: `${index * 45}ms` }}>
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
