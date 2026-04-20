import { NextResponse } from "next/server";
import { getAuthenticatedOctokit } from "@/lib/github";

export async function GET() {
  try {
    const octokit = await getAuthenticatedOctokit();
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator,organization_member"
    });

    const normalized = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      private: repo.private,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
      url: repo.html_url
    }));

    return NextResponse.json({ repos: normalized });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load repositories." },
      { status: 500 }
    );
  }
}
