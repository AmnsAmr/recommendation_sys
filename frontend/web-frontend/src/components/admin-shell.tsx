"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { AdminGuard, useAuth } from "@/lib/auth";

const adminNav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/user-management", label: "Users" },
  { href: "/admin/video-moderation", label: "Moderation" },
];

export function AdminShell({ children, title }: { children: React.ReactNode; title: string }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[280px_1fr]">
          <aside className="border-b border-white/10 bg-slate-950 px-4 py-5 lg:border-b-0 lg:border-r lg:px-5">
            <div className="flex items-center gap-3">
              <BrandMark variant="inverse" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-200">Admin console</p>
                <p className="mt-1 text-sm text-white/60">Separated workspace</p>
              </div>
            </div>

            <nav className="mt-6 grid gap-2">
              {adminNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-3 text-sm font-bold transition ${
                      active ? "bg-teal-500 text-slate-950" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={logout}
                className="mt-3 rounded-lg border border-rose-400/30 px-3 py-3 text-left text-sm font-bold text-rose-200 transition hover:bg-rose-400/10"
              >
                Sign out
              </button>
            </nav>

            <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">Mode</p>
              <p className="mt-2 text-sm font-bold text-white">Administration only</p>
              <p className="mt-1 text-xs leading-5 text-white/50">No user feed links are available here.</p>
            </div>
          </aside>

          <section className="min-w-0 bg-slate-100 text-slate-950">
            <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">VideoRec admin</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">{title}</h1>
            </header>
            <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          </section>
        </div>
      </div>
    </AdminGuard>
  );
}
