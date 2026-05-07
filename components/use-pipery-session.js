"use client";

import { useEffect, useState } from "react";

export function usePiperySession() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/pipery/session", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        setSession(data.session || null);
        setStatus(data.authenticated ? "authenticated" : "unauthenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setSession(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data: session, status };
}
