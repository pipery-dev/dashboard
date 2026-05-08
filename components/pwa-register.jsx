"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          registration.update().catch(() => {
            // Keep update failures quiet in the UI.
          });
        })
        .catch(() => {
          // Keep registration failures quiet in the UI.
        });
    }
  }, []);

  return null;
}
