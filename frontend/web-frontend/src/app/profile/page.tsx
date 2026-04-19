const interests = ["Technology", "Science", "Programming"];
const uploads = [
  { title: "Intro to Kafka", views: "342 views" },
  { title: "Docker tutorial", views: "128 views" },
  { title: "Spring Boot guide", views: "89 views" },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-xl font-semibold text-sky-200">AL</div>
                <div>
                  <p className="text-sm text-slate-400">@alice_dev · 3 videos uploaded</p>
                  <h1 className="mt-2 text-2xl font-semibold text-slate-100">Alice</h1>
                  <p className="text-sm text-slate-500">Backend developer, coffee enthusiast.</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-100">My interests</h2>
                  <button className="text-sm text-sky-400 hover:text-sky-300">+ Update interests</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.map((item) => (
                    <span key={item} className="rounded-full bg-slate-800 px-4 py-2 text-sm text-slate-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button className="h-12 rounded-full bg-slate-800 px-6 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">
              Edit profile
            </button>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-100">My uploads</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {uploads.map((video) => (
                <div key={video.title} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                  <div className="mb-4 h-28 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800" />
                  <h3 className="text-lg font-semibold text-slate-100">{video.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{video.views}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
