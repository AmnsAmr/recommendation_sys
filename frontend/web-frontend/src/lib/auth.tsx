"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/api";
import type { AuthUser } from "@/lib/types";

const AUTH_EVENT = "videorec-auth-change";
const AUTH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const TEST_USER: AuthUser = {
  userId: process.env.NEXT_PUBLIC_TEST_USER_ID || "00000000-0000-0000-0000-000000000001",
  email: "test-mode@local.invalid",
  role: "USER",
  username: "test-mode",
  displayName: "Test Mode",
};

export function emitAuthChange() {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function readUserSnapshot() {
  if (typeof window === "undefined") {
    return null;
  }

  if (AUTH_DISABLED) {
    return JSON.stringify(TEST_USER);
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

function parseUser(value: string | null): AuthUser | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

export function isAdminUser(user: AuthUser | null) {
  return user?.role?.toLowerCase() === "admin";
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (AUTH_DISABLED) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (!isAdminUser(user)) {
      router.push("/login");
    }
  }, [router, user]);

  if (AUTH_DISABLED) {
    return <>{children}</>;
  }

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
  const user = useMemo(() => (AUTH_DISABLED ? TEST_USER : parseUser(rawUser)), [rawUser]);

  const logout = () => {
    // History is per-user (see history.ts) so it doesn't leak between accounts;
    // we intentionally do NOT wipe it on logout so the same user gets their
    // history back on their next login (YouTube-style). If a privacy-sensitive
    // "sign out and clear my history" button is needed, add it separately.
    window.localStorage.removeItem("user");
    clearAuthToken();
    emitAuthChange();
    window.location.href = AUTH_DISABLED ? "/homepage" : "/login";
  };

  return { user, logout };
}
