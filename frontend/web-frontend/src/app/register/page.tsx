"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { categories } from "@/lib/mock-data";

const interests = categories.filter((category) => category !== "For you");

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("user");
  const [selected, setSelected] = useState(["Fashion", "Music"]);
  const [error, setError] = useState("");

  const toggle = (interest: string) => {
    setSelected((current) =>
      current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest],
    );
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();

    if (!displayName.trim() || !email.trim() || !password) {
      setError("Please fill name, email and password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (selected.length === 0) {
      setError("Pick at least one interest.");
      return;
    }

    const user = {
      email,
      role,
      username: displayName.trim() || email.split("@")[0],
      interests: selected,
    };

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("videorec-created-account", JSON.stringify(user));
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
        <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold text-teal-700 hover:bg-teal-50">
          Sign in
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-4 py-10">
        <form onSubmit={handleRegister} className="grid w-full gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-xl shadow-slate-900/10 backdrop-blur sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">Create account</p>
            <h1 className="mt-3 text-4xl font-black text-slate-950">Join VideoRec</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Create a profile to save videos, keep your watch history, and personalize your recommendations.
            </p>

            <div className="mt-6 rounded-2xl bg-slate-950 p-5 text-white">
              <p className="text-sm font-black">{selected.length} interests selected</p>
              <p className="mt-1 text-xs leading-5 text-white/65">
                These choices personalize the first videos you see.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            <div className="h-2 bg-gradient-to-r from-teal-700 via-emerald-400 to-orange-400" />
            <div className="p-6 sm:p-8">
              {error ? (
                <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Display name</span>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Douae"
                    className="field mt-2 h-12 rounded-xl px-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="douae@test.com"
                    className="field mt-2 h-12 rounded-xl px-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="field mt-2 h-12 rounded-xl px-4"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-700">Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    className="field mt-2 h-12 rounded-xl px-4"
                  />
                </label>
              </div>

              <div className="mt-5">
                <span className="text-sm font-bold text-slate-700">Account type</span>
                <div className="mt-2 grid grid-cols-2 rounded-full bg-slate-100 p-1">
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
              </div>

              <div className="mt-6">
                <span className="text-sm font-bold text-slate-700">Choose interests</span>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {interests.map((interest) => {
                    const active = selected.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggle(interest)}
                        className={`rounded-full border px-3 py-2 text-sm font-bold transition ${
                          active
                            ? "border-teal-700 bg-teal-50 text-teal-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
                        }`}
                      >
                        {active ? "✓ " : "+ "}
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" className="mt-6 h-12 w-full rounded-full bg-gradient-to-r from-teal-700 to-orange-500 px-5 text-sm font-black text-white shadow-lg shadow-orange-500/20 transition hover:scale-[1.01]">
                Create account
              </button>

              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-teal-700 hover:text-teal-800">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
