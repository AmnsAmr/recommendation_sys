"use client";

import { AdminGuard } from "@/lib/auth";

const userMetrics = [
  { label: "Total users", value: "1,284", detail: "+12 this week" },
  { label: "Active", value: "1,261", detail: "" },
  { label: "Banned", value: "23", detail: "3 this week" },
  { label: "Admins", value: "2", detail: "" },
  { label: "New (7d)", value: "12", detail: "+20%" },
];

const videoMetrics = [
  { label: "Total videos", value: "542" },
  { label: "Public (ready)", value: "498" },
  { label: "Pending review", value: "4", detail: "needs action" },
  { label: "Rejected", value: "7" },
  { label: "Total views", value: "48.2k" },
];

const recentActivity = [
  {
    time: "2 min ago",
    event: 'New video uploaded — "Spring Boot REST API"',
    actor: "alice_dev",
    action: "pending",
  },
  {
    time: "14 min ago",
    event: "User banned — spam behavior",
    actor: "Admin",
    action: "banned",
  },
  {
    time: "1h ago",
    event: 'Video approved — "Kafka tutorial"',
    actor: "Admin",
    action: "approved",
  },
];

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <DashboardContent />
    </AdminGuard>
  );
}

function DashboardContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-sky-400">
              VideoRec — Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold">Dashboard</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="text-sky-300">Dashboard</span>
            <button className="rounded-full px-4 py-2 text-slate-300 transition hover:bg-slate-800">
              Users
            </button>
            <button className="rounded-full bg-slate-800 px-4 py-2 text-slate-100 transition">
              Videos 4
            </button>
            <button className="rounded-full px-4 py-2 text-slate-300 transition hover:bg-slate-800">
              Back to site
            </button>
          </nav>
        </div>

        <section className="grid gap-4 lg:grid-cols-5">
          {userMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {metric.value}
              </p>
              {metric.detail ? (
                <p className="mt-2 text-sm text-slate-400">{metric.detail}</p>
              ) : null}
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-5">
          {videoMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {metric.value}
              </p>
              {metric.detail ? (
                <p className="mt-2 text-sm text-slate-400">{metric.detail}</p>
              ) : null}
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-slate-100">
            Recent activity
          </h2>
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
            <div className="grid grid-cols-4 gap-4 border-b border-slate-800 bg-slate-900 px-5 py-3 text-xs uppercase tracking-[0.24em] text-slate-500 sm:grid-cols-[1.5fr_2fr_1fr_1fr]">
              <span>Time</span>
              <span>Event</span>
              <span>Actor</span>
              <span>Action</span>
            </div>
            <div className="divide-y divide-slate-800">
              {recentActivity.map((item) => (
                <div
                  key={item.time}
                  className="grid grid-cols-4 gap-4 px-5 py-4 text-sm text-slate-200 sm:grid-cols-[1.5fr_2fr_1fr_1fr]"
                >
                  <span>{item.time}</span>
                  <span>{item.event}</span>
                  <span>{item.actor}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${item.action === "approved" ? "bg-emerald-500/15 text-emerald-300" : item.action === "pending" ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300"}`}
                  >
                    {item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
