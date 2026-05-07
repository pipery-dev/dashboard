"use client";

import { useSession } from "next-auth/react";

function dashboardCallbackUrl() {
  return encodeURIComponent(window.location.href);
}

export function SignInButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <button className="ghostButton" disabled>
        Checking session
      </button>
    );
  }

  if (session) {
    return (
      <button
        className="ghostButton"
        onClick={() => {
          const callbackUrl = dashboardCallbackUrl();
          window.location.href = `https://auth.pipery.dev/api/auth/logout?callbackUrl=${callbackUrl}&provider=github`;
        }}
      >
        Sign out GitHub
      </button>
    );
  }

  return (
    <button
      className="primaryButton"
      onClick={() => {
        const callbackUrl = dashboardCallbackUrl();
        window.location.href = `/api/auth/start?callbackUrl=${callbackUrl}`;
      }}
    >
      Sign in with GitHub
    </button>
  );
}
