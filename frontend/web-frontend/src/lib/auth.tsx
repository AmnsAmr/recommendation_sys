"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

type User = {
  email: string;
  role: string;
  username: string;
};

const AUTH_EVENT = "videorec-auth-change";

function readUserSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("user");
}

function subscribeToAuthChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_EVENT, onStoreChange);
  };
}

function parseUser(value: string | null): User | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as User;
  } catch {
    return null;
  }
}

export function isAdminUser(user: User | null) {
  return user?.role?.toLowerCase() === "admin";
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    if (!isAdminUser(user)) {
      router.push("/login");
    }
  }, [router, user]);

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-black text-slate-950">Redirecting to login</p>
          <p className="mt-2 text-sm text-slate-500">Admin pages need an active admin session.</p>
        </div>
      </div>
    );
  }

  if (!isAdminUser(user)) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-black text-slate-950">Admin access required</p>
          <p className="mt-2 text-sm text-slate-500">Please sign in with Admin console mode.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function useAuth() {
  const rawUser = useSyncExternalStore(subscribeToAuthChanges, readUserSnapshot, () => null);
  const user = useMemo(() => parseUser(rawUser), [rawUser]);

  const logout = () => {
    window.localStorage.removeItem("user");
    window.dispatchEvent(new Event(AUTH_EVENT));
    window.location.href = "/login";
  };

  return { user, logout };
}
