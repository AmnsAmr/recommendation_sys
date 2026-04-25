"use client";

import { useState } from "react";
import { AdminShell } from "@/components/admin-shell";

const metrics = [
  { label: "Users", value: "1,284", detail: "+12 this week" },
  { label: "Active users", value: "1,261", detail: "98.2% healthy" },
  { label: "Videos", value: "542", detail: "498 public" },
  { label: "Pending", value: "4", detail: "Needs review" },
  { label: "Views", value: "48.2k", detail: "+18% this month" },
];

const activity = [
  { time: "2 min ago", event: "Spring Boot REST API uploaded", actor: "alice_dev", status: "pending" },
  { time: "14 min ago", event: "User banned for spam behavior", actor: "Admin", status: "banned" },
  { time: "1h ago", event: "Kafka tutorial approved", actor: "Admin", status: "approved" },
  { time: "3h ago", event: "Recommendation cache refreshed", actor: "System", status: "complete" },
];

export default function AdminDashboardPage() {
  const [exported, setExported] = useState(false);

  const exportReport = () => {
    setExported(true);
    window.setTimeout(() => setExported(false), 1400);
  };

  return (
    <AdminShell title="Dashboard">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div key={metric.label} className="magnetic-card rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-950">{metric.value}</p>
            <p className="mt-1 text-sm text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Recent activity</h2>
              <p className="mt-1 text-sm text-slate-500">Operational events across services.</p>
            </div>
            <button
              onClick={exportReport}
              className="pressable rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {exported ? "Exported" : "Export"}
            </button>
          </div>
          {exported ? (
            <div className="reaction-burst mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
              Dashboard report prepared locally.
            </div>
          ) : null}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="py-3 font-bold">Time</th>
                  <th className="py-3 font-bold">Event</th>
                  <th className="py-3 font-bold">Actor</th>
                  <th className="py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activity.map((item) => (
                  <tr key={`${item.time}-${item.event}`}>
                    <td className="py-4 text-slate-500">{item.time}</td>
                    <td className="py-4 font-semibold text-slate-950">{item.event}</td>
                    <td className="py-4 text-slate-600">{item.actor}</td>
                    <td className="py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
          <h2 className="text-xl font-black">System readiness</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Frontend is live. Full API connectivity requires the project `.env` credentials for Supabase and Kafka.
          </p>
          <div className="mt-5 space-y-3">
            {["API gateway", "User service", "Video service", "Recommendation service"].map((service) => (
              <div key={service} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
                <span className="text-sm font-semibold">{service}</span>
                <span className="rounded bg-orange-400/20 px-2 py-1 text-xs font-bold text-orange-100">Waiting env</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </AdminShell>
  );
}
