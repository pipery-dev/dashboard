"use client";

import { signIn, signOut, useSession } from "next-auth/react";

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
      <button className="ghostButton" onClick={() => signOut({ callbackUrl: "/" })}>
        Sign out
      </button>
    );
  }

  return (
    <button className="primaryButton" onClick={() => signIn("github")}>
      Sign in with GitHub
    </button>
  );
}
