"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton({ session }) {
  if (session) {
    return (
      <button className="ghostButton" onClick={() => signOut()}>
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
