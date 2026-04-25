type PosterKind =
  | "api"
  | "streams"
  | "docker"
  | "ai"
  | "database"
  | "react"
  | "fashion"
  | "fashion2"
  | "music"
  | "sport"
  | "food"
  | "travel"
  | "gaming";

const posterStyles: Record<PosterKind, { bg: string; panel: string; accent: string; title: string; subtitle: string }> = {
  api: {
    bg: "from-teal-950 via-slate-900 to-emerald-800",
    panel: "bg-emerald-300/18 border-emerald-100/25",
    accent: "bg-orange-400",
    title: "REST API",
    subtitle: "Spring Boot",
  },
  streams: {
    bg: "from-slate-950 via-cyan-950 to-teal-800",
    panel: "bg-cyan-300/16 border-cyan-100/25",
    accent: "bg-cyan-300",
    title: "Kafka",
    subtitle: "Streams",
  },
  docker: {
    bg: "from-blue-950 via-slate-900 to-sky-700",
    panel: "bg-sky-300/18 border-sky-100/25",
    accent: "bg-white",
    title: "Docker",
    subtitle: "Deploy",
  },
  ai: {
    bg: "from-slate-950 via-fuchsia-950 to-orange-700",
    panel: "bg-orange-300/18 border-orange-100/25",
    accent: "bg-fuchsia-300",
    title: "Reco AI",
    subtitle: "Ranking",
  },
  database: {
    bg: "from-slate-950 via-indigo-950 to-teal-700",
    panel: "bg-indigo-300/18 border-indigo-100/25",
    accent: "bg-teal-300",
    title: "SQL",
    subtitle: "Joins",
  },
  react: {
    bg: "from-slate-950 via-blue-950 to-violet-700",
    panel: "bg-blue-300/18 border-blue-100/25",
    accent: "bg-blue-300",
    title: "React",
    subtitle: "State",
  },
  fashion: {
    bg: "from-rose-950 via-pink-900 to-orange-600",
    panel: "bg-pink-200/22 border-pink-100/30",
    accent: "bg-white",
    title: "Fashion",
    subtitle: "Lookbook",
  },
  fashion2: {
    bg: "from-stone-950 via-amber-900 to-rose-500",
    panel: "bg-amber-200/20 border-amber-100/30",
    accent: "bg-rose-200",
    title: "Outfits",
    subtitle: "Summer edit",
  },
  music: {
    bg: "from-violet-950 via-fuchsia-900 to-cyan-600",
    panel: "bg-fuchsia-200/20 border-fuchsia-100/30",
    accent: "bg-cyan-200",
    title: "Music",
    subtitle: "Studio live",
  },
  sport: {
    bg: "from-emerald-950 via-lime-900 to-sky-700",
    panel: "bg-lime-200/20 border-lime-100/30",
    accent: "bg-lime-300",
    title: "Sport",
    subtitle: "Training",
  },
  food: {
    bg: "from-orange-950 via-red-900 to-yellow-600",
    panel: "bg-yellow-200/22 border-yellow-100/30",
    accent: "bg-red-200",
    title: "Food",
    subtitle: "Quick dinner",
  },
  travel: {
    bg: "from-sky-950 via-teal-900 to-amber-600",
    panel: "bg-sky-200/18 border-sky-100/30",
    accent: "bg-amber-200",
    title: "Travel",
    subtitle: "Weekend guide",
  },
  gaming: {
    bg: "from-slate-950 via-purple-950 to-emerald-700",
    panel: "bg-purple-200/20 border-purple-100/30",
    accent: "bg-emerald-300",
    title: "Gaming",
    subtitle: "Indie picks",
  },
};

export type VideoPosterKind = PosterKind;

export function VideoPoster({
  kind = "api",
  duration,
  label,
  className = "",
  player = false,
}: {
  kind?: string;
  duration?: string;
  label?: string;
  className?: string;
  player?: boolean;
}) {
  const style = posterStyles[(kind as PosterKind) in posterStyles ? (kind as PosterKind) : "api"];

  return (
    <div className={`group/poster relative overflow-hidden rounded-lg bg-gradient-to-br ${style.bg} ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.2),transparent_22%),radial-gradient(circle_at_82%_28%,rgba(255,255,255,.15),transparent_24%)] transition duration-500 group-hover/poster:scale-110" />
      <div className="absolute -left-1/4 top-0 h-full w-1/4 bg-white/20 blur-xl transition duration-700 group-hover/poster:translate-x-[620%]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
      <div className="absolute left-[8%] top-[12%] h-[66%] w-[54%] rounded-lg border border-white/18 bg-white/12 p-3 shadow-2xl backdrop-blur-sm transition duration-500 group-hover/poster:-translate-y-1 group-hover/poster:rotate-[-1deg]">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
        <div className="mt-4 space-y-2">
          <span className="block h-2.5 w-3/4 rounded-full bg-white/75" />
          <span className="block h-2.5 w-1/2 rounded-full bg-white/45" />
          <span className={`block h-2.5 w-2/3 rounded-full ${style.accent}`} />
          <span className="block h-2.5 w-5/6 rounded-full bg-white/35" />
        </div>
      </div>
      <div className={`absolute right-[7%] top-[18%] grid h-[38%] w-[30%] place-items-center rounded-lg border ${style.panel} backdrop-blur-sm transition duration-500 group-hover/poster:translate-y-1 group-hover/poster:rotate-2`}>
        <div className="h-12 w-12 rounded-full border-[10px] border-white/70 border-r-transparent transition duration-700 group-hover/poster:rotate-180" />
      </div>
      <div className="absolute bottom-4 left-4 right-4">
        {label ? (
          <span className="mb-2 inline-flex rounded bg-white/92 px-2 py-1 text-xs font-black text-slate-950">
            {label}
          </span>
        ) : null}
        <p className={`${player ? "text-4xl sm:text-5xl" : "text-2xl"} font-black leading-none text-white`}>
          {style.title}
        </p>
        <p className="mt-1 text-sm font-bold text-white/78">{style.subtitle}</p>
      </div>
      {player ? (
        <div className="absolute inset-0 grid place-items-center">
          <span className="pulse-ring grid h-16 w-16 place-items-center rounded-full bg-white/92 text-sm font-black text-slate-950 shadow-2xl transition duration-300 group-hover/poster:scale-110">
            PLAY
          </span>
        </div>
      ) : null}
      {duration ? (
        <span className="absolute bottom-2 right-2 rounded bg-slate-950/88 px-2 py-1 text-xs font-bold text-white">
          {duration}
        </span>
      ) : null}
    </div>
  );
}
