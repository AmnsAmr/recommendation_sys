"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Store user info in localStorage
    localStorage.setItem(
      "user",
      JSON.stringify({
        email,
        role,
        username: email.split("@")[0],
      })
    );

    // Redirect all users to the homepage after login
    router.push("/homepage");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.32em] text-sky-400">VideoRec</p>
            <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
          </div>

          {error && (
            <div className="mb-6 rounded-3xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-400">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alice@example.com"
                className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/25"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <button
              type="submit"
              className="mt-6 w-full rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
