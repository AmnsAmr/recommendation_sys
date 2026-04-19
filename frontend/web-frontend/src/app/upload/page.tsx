export default function UploadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold">Upload a video</h1>
          <p className="mt-2 text-sm text-slate-400">MP4, WebM or MOV · max 500 MB</p>

          <div className="mt-8 space-y-6">
            <label className="block rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-10 text-center text-sm text-slate-300">
              <span className="mb-3 block text-base font-semibold text-slate-100">Drop your video file here</span>
              <button className="mt-3 inline-flex rounded-full bg-slate-800 px-6 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700">
                Browse file
              </button>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-400">Title</span>
                <input
                  type="text"
                  placeholder="Give your video a title"
                  className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
                />
              </label>
              <label className="block">
                <span className="text-sm text-slate-400">Category</span>
                <select className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25">
                  <option>Technology</option>
                  <option>Science</option>
                  <option>Education</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm text-slate-400">Tags (comma separated)</span>
              <input
                type="text"
                placeholder="kafka, backend, tutorial"
                className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">Language</span>
              <select className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25">
                <option>English</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
            </label>

            <button className="w-full rounded-3xl bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">
              Upload video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
