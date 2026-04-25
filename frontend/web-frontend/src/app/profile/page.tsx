import { AppShell } from "@/components/app-shell";
import { VideoCard } from "@/components/video-card";
import { videos } from "@/lib/mock-data";

const interests = ["Backend", "AI", "Data"];

export default function ProfilePage() {
  return (
    <AppShell title="Creator profile" eyebrow="Account">
      <section className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="grid h-20 w-20 place-items-center rounded-lg bg-slate-950 text-2xl font-black text-white">AL</div>
            <div>
              <p className="text-sm text-slate-500">@alice_dev</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">Alice</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Backend developer focused on Java, data systems, and clean APIs.</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              ["Videos", "3"],
              ["Views", "8.4k"],
              ["Match", "94%"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-black text-slate-950">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-950">Interests</h2>
              <button className="text-sm font-bold text-teal-700">Update</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <span key={interest} className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Uploads</h2>
              <p className="text-sm text-slate-500">Published videos and performance snapshot.</p>
            </div>
            <a href="/upload" className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">
              Upload
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.slice(0, 4).map((video) => (
              <VideoCard key={video.title} video={video} />
            ))}
          </div>
        </section>
      </section>
    </AppShell>
  );
}
