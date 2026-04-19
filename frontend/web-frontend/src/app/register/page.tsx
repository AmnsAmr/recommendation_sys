const interests = ["Technology", "Science", "Gaming", "Education", "Programming", "Design", "Mathematics", "Physics"];

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.32em] text-sky-400">Create your account</p>
            <h1 className="mt-4 text-3xl font-semibold">Step 2 of 2 — Pick your interests</h1>
            <p className="mt-3 text-slate-400">What topics do you enjoy? (pick at least 1)</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {interests.map((interest) => (
              <button
                key={interest}
                className="rounded-full border border-slate-700 bg-slate-950 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-sky-400 hover:text-slate-100"
              >
                {interest}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">You can update these anytime in your profile.</p>
            <button className="inline-flex items-center justify-center rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400">
              Finish — go to my feed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
