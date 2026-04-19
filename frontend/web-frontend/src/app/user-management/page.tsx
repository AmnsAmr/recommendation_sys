"use client";

import { AdminGuard } from "@/lib/auth";

const users = [
  { username: "alice_dev", email: "alice@ex.com", role: "USER", status: "Active", joined: "Nov 1" },
  { username: "bob123", email: "bob@ex.com", role: "USER", status: "Banned", joined: "Oct 28" },
  { username: "superadmin", email: "admin@ex.com", role: "ADMIN", status: "Active", joined: "Oct 1" },
  { username: "carol_s", email: "carol@ex.com", role: "USER", status: "Active", joined: "Nov 3" },
];

export default function UserManagementPage() {
  return (
    <AdminGuard>
      <UserManagementContent />
    </AdminGuard>
  );
}

function UserManagementContent() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-sky-400">VideoRec — Admin</p>
            <h1 className="mt-3 text-3xl font-semibold">Users</h1>
          </div>
          <button className="rounded-full bg-slate-800 px-5 py-2 text-sm text-slate-100 transition hover:bg-slate-700">Back to site</button>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3 rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3">
                <input
                  className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
                  placeholder="Search email or username"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <select className="rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none">
                  <option>All roles</option>
                  <option>USER</option>
                  <option>ADMIN</option>
                </select>
                <select className="rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none">
                  <option>All status</option>
                  <option>Active</option>
                  <option>Banned</option>
                </select>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-800">
              <div className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_0.8fr] bg-slate-900 px-5 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">
                <span>Username</span>
                <span>Email</span>
                <span>Role</span>
                <span>Status</span>
                <span>Joined</span>
              </div>
              <div className="divide-y divide-slate-800 bg-slate-950">
                {users.map((user) => (
                  <div key={user.username} className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_0.8fr] items-center gap-3 px-5 py-4 text-sm text-slate-200">
                    <span>{user.username}</span>
                    <span>{user.email}</span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase text-slate-300">{user.role}</span>
                    <span className={`rounded-full px-3 py-1 text-xs ${user.status === "Active" ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                      {user.status}
                    </span>
                    <span>{user.joined}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <div className="mb-4 border-b border-slate-800 pb-4">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">User detail — bob123</p>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">User ID</span>
                <span>a1b2c3d4...</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">Email</span>
                <span>bob@example.com</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">Role</span>
                <span>USER</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">Status</span>
                <span className="text-rose-300">Banned</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">Ban reason</span>
                <span>Spam behavior in comments</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">Interests</span>
                <span>technology, gaming</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <span className="text-slate-500">Joined</span>
                <span>Oct 28, 2024</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20">Unban user</button>
              <button className="rounded-full bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20">Promote to admin</button>
              <button className="rounded-full bg-rose-500/15 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20">Delete account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
