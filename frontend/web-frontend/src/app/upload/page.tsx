import { AppShell } from "@/components/app-shell";

export default function UploadPage() {
  return (
    <AppShell title="Upload studio" eyebrow="Creator tools">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Video details</h2>
          <p className="mt-1 text-sm text-slate-500">Prepare metadata before the backend upload endpoint is connected.</p>

          <label className="mt-6 block rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <span className="block text-lg font-black text-slate-950">Drop video file here</span>
            <span className="mt-2 block text-sm text-slate-500">MP4, WebM, or MOV up to 500 MB</span>
            <span className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white">Browse file</span>
            <input type="file" accept="video/*" className="sr-only" />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Title</span>
              <input className="field mt-2 h-12 px-4" placeholder="Give your video a clear title" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Category</span>
              <select className="field mt-2 h-12 px-4">
                <option>Backend</option>
                <option>AI</option>
                <option>Data</option>
                <option>DevOps</option>
                <option>Design</option>
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea className="field mt-2 min-h-32 px-4 py-3" placeholder="Explain what viewers will learn" />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Tags</span>
              <input className="field mt-2 h-12 px-4" placeholder="spring, api, tutorial" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Language</span>
              <select className="field mt-2 h-12 px-4">
                <option>English</option>
                <option>French</option>
                <option>Arabic</option>
                <option>Spanish</option>
              </select>
            </label>
          </div>

          <button className="mt-6 h-12 w-full rounded-lg bg-teal-700 px-5 text-sm font-bold text-white hover:bg-teal-800">
            Submit for processing
          </button>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:h-fit">
          <h2 className="text-lg font-black text-slate-950">Publishing checklist</h2>
          <div className="mt-4 space-y-3">
            {[
              "Readable title",
              "Clear topic category",
              "Useful description",
              "Language selected",
              "Safe for moderation",
            ].map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-semibold text-slate-700">{item}</span>
                <span className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-500">Ready</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
