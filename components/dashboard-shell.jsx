import { Suspense } from "react";
import { SignInButton } from "@/components/sign-in-button";
import { RepoBrowser } from "@/components/repo-browser";

export function DashboardShell() {
  return (
    <main className="pageShell">
      <section className="heroCard">
        <div className="heroCopy">
          <p className="eyebrow">Local-first Pipery Explorer</p>
          <h1>Browse CI/CD artifacts and inspect `pipery.jsonl` without leaving the dashboard.</h1>
          <p className="heroText">
            Sign in with GitHub, GitLab, or Bitbucket Cloud, choose a project, build, and artifact,
            then open the JSONL output locally with search, details, and offline persistence.
          </p>
        </div>
        <div className="heroActions">
          <SignInButton />
          <p className="subtleText">
            Connect the provider that hosts the build artifact you want to inspect.
          </p>
        </div>
      </section>

      <Suspense fallback={<section className="panel emptyState"><h2>Loading dashboard</h2></section>}>
        <RepoBrowser />
      </Suspense>
    </main>
  );
}
