import { NextResponse } from "next/server";
import { getAuthenticatedOctokit } from "@/lib/github";

export async function GET(_, { params }) {
  try {
    const { owner, repo } = await params;
    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100
    });

    return NextResponse.json({
      branches: response.data.map((branch) => ({
        name: branch.name,
        protected: branch.protected
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load branches." },
      { status: 500 }
    );
  }
}
