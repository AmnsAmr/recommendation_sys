"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const categories = ["For you", "Technology", "Science", "Education", "Trending"];
const publicRoutes = [
  { href: "/watch", label: "Watch" },
  { href: "/register", label: "Register" },
  { href: "/profile", label: "Profile" },
  { href: "/upload", label: "Upload" },
];
const adminRoutes = [
  { href: "/admin/dashboard", label: "Admin Dashboard" },
  { href: "/admin/user-management", label: "User Management" },
  { href: "/admin/video-moderation", label: "Video Moderation" },
];
const recommended = [
  { 
    title: "Intro to Kafka", 
    creator: "alice_dev",
    channel: "Alice Dev Channel",
    views: "1.2k", 
    uploadedAt: "3 days ago",
    description: "Learn Apache Kafka fundamentals and start building event-driven architectures."
  },
  { 
    title: "Python tutorial", 
    creator: "bob123",
    channel: "Bob's Code",
    views: "890", 
    uploadedAt: "1 week ago",
    description: "Master Python from basics to advanced concepts including OOP and decorators."
  },
  { 
    title: "Docker basics", 
    creator: "carol_s",
    channel: "Carol's Tech",
    views: "2.1k", 
    uploadedAt: "5 days ago",
    description: "Containerize your applications and streamline deployment with Docker."
  },
  { 
    title: "Microservices", 
    creator: "dave_code",
    channel: "Dave Codes",
    views: "3.4k", 
    uploadedAt: "2 weeks ago",
    description: "Build scalable systems with microservices architecture and best practices."
  },
];
const trending = [
  { 
    title: "Machine learning", 
    creator: "eve_dev",
    channel: "Eve's AI",
    views: "12k", 
    uploadedAt: "1 day ago",
    description: "Get started with machine learning and neural networks today."
  },
  { 
    title: "Web dev 2024", 
    creator: "frank_web",
    channel: "Frank's Web Dev",
    views: "8.9k", 
    uploadedAt: "3 days ago",
    description: "Latest trends and technologies in web development for 2024."
  },
  { 
    title: "React hooks", 
    creator: "grace_dev",
    channel: "Grace Dev",
    views: "5.3k", 
    uploadedAt: "1 week ago",
    description: "Master React hooks for state management and side effects."
  },
  { 
    title: "SQL joins", 
    creator: "henry_db",
    channel: "Henry's Database",
    views: "4.1k", 
    uploadedAt: "2 weeks ago",
    description: "Understand SQL joins and write efficient database queries."
  },
];

export default function HomepagePage() {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const routes = user?.role === "admin" ? [...publicRoutes, ...adminRoutes] : publicRoutes;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8 flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">VideoRec</p>
            <h1 className="mt-3 text-3xl font-semibold">Discover what you should watch next</h1>
          </div>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="w-full sm:max-w-md">
              <label className="sr-only" htmlFor="search">Search videos</label>
              <input
                id="search"
                type="search"
                placeholder="Search videos..."
                className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-sky-200 transition hover:bg-slate-700"
              >
                {user?.username.charAt(0).toUpperCase()}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 rounded-3xl border border-slate-800 bg-slate-900 shadow-xl z-50">
                  <div className="px-4 py-3 text-xs text-slate-400">
                    {user?.email}
                    {user?.role === "admin" && <span className="ml-2 text-sky-400">ADMIN</span>}
                  </div>
                  <button
                    onClick={logout}
                    className="w-full border-t border-slate-800 px-4 py-3 text-left text-sm text-rose-300 transition hover:bg-slate-800"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <nav className="mb-8 grid gap-3 rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-sky-400 hover:text-sky-200"
            >
              {route.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap gap-3 text-sm">
          {categories.map((category) => (
            <button
              key={category}
              className={`rounded-full border px-4 py-2 transition ${category === "For you" ? "border-sky-400 bg-sky-500/10 text-sky-200" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}
            >
              {category}
            </button>
          ))}
        </div>

        <section className="mt-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">Recommended for you</h2>
              <p className="text-sm text-slate-500">Based on your recent interests and watch history.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {recommended.map((video) => (
              <article key={video.title} className="group cursor-pointer rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg transition hover:border-sky-500">
                <div className="relative mb-0 h-40 w-full overflow-hidden rounded-t-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 group-hover:scale-105 transition duration-300" />
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-100 group-hover:text-sky-300">{video.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">{video.description}</p>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950">
                      {video.creator.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{video.channel}</p>
                      <p className="text-xs text-slate-500">{video.views} views • {video.uploadedAt}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">Trending</h2>
              <p className="text-sm text-slate-500">What people are watching right now.</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {trending.map((video) => (
              <article key={video.title} className="group cursor-pointer rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg transition hover:border-sky-500">
                <div className="relative mb-0 h-40 w-full overflow-hidden rounded-t-3xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 group-hover:scale-105 transition duration-300" />
                <div className="p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-slate-100 group-hover:text-sky-300">{video.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-400">{video.description}</p>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-slate-950">
                      {video.creator.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-100 truncate">{video.channel}</p>
                      <p className="text-xs text-slate-500">{video.views} views • {video.uploadedAt}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}