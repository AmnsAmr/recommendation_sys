export function BrandMark({
  size = "md",
  showName = false,
  variant = "default",
}: {
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  variant?: "default" | "inverse";
}) {
  const sizes = {
    sm: "h-8 w-10",
    md: "h-10 w-12",
    lg: "h-16 w-20",
  };
  const textColor = variant === "inverse" ? "text-white" : "text-slate-950";
  const subTextColor = variant === "inverse" ? "text-white/70" : "text-slate-500";

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`${sizes[size]} relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-800 shadow-sm`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 120 96" className="h-full w-full" role="img">
          <rect width="120" height="96" rx="22" fill="#00635d" />
          <path
            d="M20 27H36L49 58L62 27H83C98 27 109 36 109 51C109 62 102 70 91 73L104 91H86L72 68H82C89 68 94 63 94 56C94 49 89 45 81 45H72L55 91H38L20 27Z"
            fill="white"
          />
          <path d="M45 54L62 62L46 74C42 77 38 73 40 68L42 58C43 55 43 53 45 54Z" fill="#2ba174" />
        </svg>
      </span>
      {showName ? (
        <span className="hidden leading-tight sm:block">
          <span className={`block text-sm font-black ${textColor}`}>VideoRec</span>
          <span className={`block text-xs ${subTextColor}`}>Smart video platform</span>
        </span>
      ) : null}
    </span>
  );
}
