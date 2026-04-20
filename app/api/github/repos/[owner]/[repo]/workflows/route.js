import { NextResponse } from "next/server";
import { getAuthenticatedOctokit } from "@/lib/github";

export async function GET(_, { params }) {
  try {
    const { owner, repo } = await params;
    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.rest.actions.listRepoWorkflows({
      owner,
      repo,
      per_page: 100
    });

    return NextResponse.json({
      workflows: response.data.workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        path: workflow.path,
        state: workflow.state
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load workflows." },
      { status: 500 }
    );
  }
}
