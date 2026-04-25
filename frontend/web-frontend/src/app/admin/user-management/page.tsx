"use client";

import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { users as seedUsers } from "@/lib/mock-data";

type AdminUser = (typeof seedUsers)[number];

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>(seedUsers);
  const [selectedUsername, setSelectedUsername] = useState("bob123");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All roles");
  const [notice, setNotice] = useState("");

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesQuery = `${user.username} ${user.email}`.toLowerCase().includes(query.toLowerCase());
        const matchesRole = role === "All roles" || user.role === role;
        return matchesQuery && matchesRole;
      }),
    [query, role, users],
  );

  const selectedUser = users.find((user) => user.username === selectedUsername) || users[0];

  const updateSelectedUser = (changes: Partial<AdminUser>, message: string) => {
    setUsers((current) =>
      current.map((user) => (user.username === selectedUser.username ? { ...user, ...changes } : user)),
    );
    setNotice(message);
  };

  const deleteSelectedUser = () => {
    setUsers((current) => current.filter((user) => user.username !== selectedUser.username));
    setSelectedUsername(users.find((user) => user.username !== selectedUser.username)?.username || "");
    setNotice(`${selectedUser.username} deleted locally.`);
  };

  return (
    <AdminShell title="User management">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Users</h2>
              <p className="mt-1 text-sm text-slate-500">Search, audit, and manage platform access.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="field h-10 px-3 text-sm"
                placeholder="Search user"
              />
              <select value={role} onChange={(event) => setRole(event.target.value)} className="field h-10 w-36 px-3 text-sm">
                <option>All roles</option>
                <option>USER</option>
                <option>ADMIN</option>
              </select>
            </div>
          </div>

          {notice ? (
            <div className="reaction-burst mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800">
              {notice}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-500">
                <tr>
                  <th className="py-3 font-bold">Username</th>
                  <th className="py-3 font-bold">Email</th>
                  <th className="py-3 font-bold">Role</th>
                  <th className="py-3 font-bold">Status</th>
                  <th className="py-3 font-bold">Joined</th>
                  <th className="py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.username} className={selectedUser?.username === user.username ? "bg-teal-50/50" : ""}>
                    <td className="py-4 font-bold text-slate-950">{user.username}</td>
                    <td className="py-4 text-slate-600">{user.email}</td>
                    <td className="py-4">
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{user.role}</span>
                    </td>
                    <td className="py-4">
                      <span className={`rounded-lg px-2 py-1 text-xs font-bold ${user.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500">{user.joined}</td>
                    <td className="py-4">
                      <button
                        onClick={() => {
                          setSelectedUsername(user.username);
                          setNotice(`Reviewing ${user.username}.`);
                        }}
                        className="pressable rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {selectedUser ? (
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:h-fit">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Selected user</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedUser.username}</h2>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["Email", selectedUser.email],
                ["Role", selectedUser.role],
                ["Status", selectedUser.status],
                ["Reason", selectedUser.status === "Banned" ? "Spam behavior" : "No active restriction"],
                ["Interests", "technology, gaming"],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[100px_1fr] gap-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-semibold text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 grid gap-2">
              <button
                onClick={() => updateSelectedUser({ status: selectedUser.status === "Banned" ? "Active" : "Banned" }, `${selectedUser.username} status updated.`)}
                className="pressable rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                {selectedUser.status === "Banned" ? "Unban user" : "Ban user"}
              </button>
              <button
                onClick={() => updateSelectedUser({ role: selectedUser.role === "ADMIN" ? "USER" : "ADMIN" }, `${selectedUser.username} role updated.`)}
                className="pressable rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                {selectedUser.role === "ADMIN" ? "Demote to user" : "Promote to admin"}
              </button>
              <button
                onClick={deleteSelectedUser}
                className="pressable rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                Delete account
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </AdminShell>
  );
}
