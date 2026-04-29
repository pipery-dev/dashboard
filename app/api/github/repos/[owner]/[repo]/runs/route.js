import { NextResponse } from "next/server";
import { z } from "zod";
import { listRuns } from "@/lib/github-api";
import { getGitHubAccessToken } from "@/lib/github";

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

    const token = await getGitHubAccessToken();
    return NextResponse.json({
      runs: await listRuns(owner, repo, query.workflowId, query.branch, token)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load workflow runs." },
      { status: 500 }
    );
  }
}
