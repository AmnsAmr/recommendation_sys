"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    localStorage.setItem(
      "user",
      JSON.stringify({
        email,
        role,
        username: email.split("@")[0],
      }),
    );

    router.push(role === "admin" ? "/admin/dashboard" : "/homepage");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_18%,rgba(15,118,110,.18),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(249,115,22,.16),transparent_28%),linear-gradient(180deg,#ffffff,#f8fafc)] text-slate-950">
      <div className="wave-layer wave-three" />
      <div className="wave-layer wave-one" />
      <div className="wave-layer wave-two" />

      <header className="relative z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/login" className="focus-ring rounded-lg">
          <BrandMark showName />
        </Link>
        <Link href="/register" className="rounded-full px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
          Create account
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div className="hidden lg:block">
            <div className="mb-8 grid h-36 w-64 place-items-center rounded-[2rem] bg-teal-800 shadow-2xl shadow-teal-900/20">
              <div className="rounded-full bg-white px-7 py-4 text-sm font-black uppercase tracking-[0.2em] text-teal-800">
                Watch now
              </div>
            </div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">Video platform</p>
            <h1 className="mt-4 max-w-xl text-5xl font-black leading-tight text-slate-950">
              Sign in to watch, save, and continue your videos.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              A video-first experience with recommendations, categories, watch history, and creator uploads.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="h-2 bg-gradient-to-r from-teal-700 via-emerald-400 to-orange-400" />
            <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-black text-slate-950">Sign in</h2>
              <p className="mt-2 text-sm text-slate-500">Use any email and password while the backend is offline.</p>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-full bg-slate-100 p-1">
              {[
                ["user", "User"],
                ["admin", "Admin"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    role === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {error ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="user@test.com"
                  className="field mt-2 h-12 rounded-xl px-4"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-700">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="123456"
                  className="field mt-2 h-12 rounded-xl px-4"
                />
              </label>

              <button type="submit" className="h-12 w-full rounded-full bg-gradient-to-r from-teal-700 to-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01]">
                Continue as {role === "admin" ? "Admin" : "User"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              New here?{" "}
              <Link href="/register" className="font-bold text-teal-700 hover:text-teal-800">
                Pick interests
              </Link>
            </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
