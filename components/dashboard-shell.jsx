"use client";

import { SessionProvider } from "next-auth/react";
import { SignInButton } from "@/components/sign-in-button";
import { RepoBrowser } from "@/components/repo-browser";

export function DashboardShell({ session }) {
  return (
    <SessionProvider session={session}>
      <main className="pageShell">
        <section className="heroCard">
          <div className="heroCopy">
            <p className="eyebrow">Local-first Pipery Explorer</p>
            <h1>Browse GitHub artifacts and inspect `pipery.jsonl` without leaving the dashboard.</h1>
            <p className="heroText">
              Sign in with GitHub, grant repository access, choose a repository, branch, workflow,
              run, and artifact, then open the JSONL output locally with search, details, and
              offline persistence.
            </p>
          </div>
          <div className="heroActions">
            <SignInButton />
            <p className="subtleText">
              Required GitHub OAuth scopes: <code>read:user repo</code>
            </p>
          </div>
        </section>

        <RepoBrowser />
      </main>
    </SessionProvider>
  );
}
