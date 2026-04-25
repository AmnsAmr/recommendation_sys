"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { isAdminUser, useAuth } from "@/lib/auth";

const navItems = [
  { href: "/homepage", label: "Home" },
  { href: "/watch", label: "Watch" },
  { href: "/homepage?genre=Fashion", label: "Fashion" },
  { href: "/homepage?genre=Music", label: "Music" },
  { href: "/homepage?genre=Gaming", label: "Gaming" },
  { href: "/history", label: "History" },
  { href: "/upload", label: "Upload" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({
  children,
  title,
  eyebrow = "VideoRec",
  actions,
}: {
  children: React.ReactNode;
  title?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const initials = user?.username?.slice(0, 2).toUpperCase() || "VR";

  useEffect(() => {
    if (isAdminUser(user)) {
      router.replace("/admin/dashboard");
    }
  }, [router, user]);

  if (isAdminUser(user)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 px-4 text-center text-white">
        <div className="rounded-lg border border-white/10 bg-white/10 p-6 shadow-2xl">
          <p className="text-lg font-black">Opening admin console</p>
          <p className="mt-2 text-sm text-white/70">Admin sessions are separated from the user site.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
          <Link href="/homepage" className="flex items-center gap-3 focus-ring rounded-lg">
            <BrandMark showName />
          </Link>

          <div className="mx-auto hidden min-w-0 flex-1 justify-center md:flex md:max-w-2xl">
            <label className="sr-only" htmlFor="global-search">
              Search videos
            </label>
            <div className="flex w-full overflow-hidden rounded-full border border-slate-300 bg-white">
              <input
                id="global-search"
                type="search"
                placeholder="Search"
                className="h-10 min-w-0 flex-1 px-4 text-sm outline-none"
              />
              <button className="border-l border-slate-300 bg-slate-50 px-5 text-sm font-bold text-slate-700 hover:bg-slate-100">
                Search
              </button>
            </div>
          </div>

          <Link
            href="/upload"
            className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 sm:block"
          >
            Create
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="focus-ring grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-sm font-bold text-teal-800 shadow-sm"
              aria-label="Open account menu"
            >
              {initials}
            </button>
            {open ? (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-3">
                  <p className="truncate text-sm font-semibold text-slate-950">{user?.username || "Guest user"}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email || "Not signed in"}</p>
                </div>
                <div className="grid gap-1 py-2">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                      {item.label}
                    </Link>
                  ))}
                </div>
                {user ? (
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link href="/login" className="block rounded-lg px-3 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50">
                    Sign in
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[220px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-slate-200 bg-white px-3 py-4 lg:block">
          <nav className="sticky top-20 grid gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    active ? "bg-slate-100 text-slate-950" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="w-full px-4 py-5 sm:px-6 lg:px-8">
          {title ? (
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
                <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">{title}</h1>
              </div>
              {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
