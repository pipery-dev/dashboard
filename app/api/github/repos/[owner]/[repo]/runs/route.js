import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedOctokit } from "@/lib/github";

const querySchema = z.object({
  branch: z.string().min(1),
  workflowId: z.string().min(1)
});

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params;
    const query = querySchema.parse({
      branch: request.nextUrl.searchParams.get("branch"),
      workflowId: request.nextUrl.searchParams.get("workflowId")
    });

    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: query.workflowId,
      branch: query.branch,
      per_page: 50
    });

    return NextResponse.json({
      runs: response.data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name,
        displayTitle: run.display_title,
        event: run.event,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        htmlUrl: run.html_url
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load workflow runs." },
      { status: 500 }
    );
  }
}
