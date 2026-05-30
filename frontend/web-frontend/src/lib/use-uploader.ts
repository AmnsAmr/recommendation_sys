"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Resolve a user UUID to a display name (e.g. "Tester02") for cards/details.
 *
 * Reads from api.getProfile which already caches per userId (10 min TTL) and
 * dedupes concurrent in-flight requests, so rendering 24 cards by 10 unique
 * uploaders triggers at most 10 network calls — and zero on subsequent loads
 * within the TTL.
 *
 * Returns null while loading or on failure; callers should fall back to their
 * existing label (e.g. `Creator <uuid8>` or "YouTube").
 */
export function useUploaderName(uploaderId?: string | null): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!uploaderId) {
      setName(null);
      return;
    }

    let active = true;
    api.getProfile(uploaderId)
      .then((profile) => {
        if (active) {
          setName(profile.displayName?.trim() || profile.username?.trim() || null);
        }
      })
      .catch(() => {
        // Unauthenticated viewer, missing user, or backend hiccup — let caller
        // fall back to its existing label.
        if (active) {
          setName(null);
        }
      });

    return () => {
      active = false;
    };
  }, [uploaderId]);

  return name;
}
