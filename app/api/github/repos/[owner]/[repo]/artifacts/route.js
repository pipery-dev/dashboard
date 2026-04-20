import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedOctokit } from "@/lib/github";

const querySchema = z.object({
  runId: z.string().min(1)
});

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params;
    const query = querySchema.parse({
      runId: request.nextUrl.searchParams.get("runId")
    });

    const octokit = await getAuthenticatedOctokit();
    const response = await octokit.rest.actions.listWorkflowRunArtifacts({
      owner,
      repo,
      run_id: Number(query.runId),
      per_page: 100
    });

    return NextResponse.json({
      artifacts: response.data.artifacts.map((artifact) => ({
        id: artifact.id,
        name: artifact.name,
        sizeInBytes: artifact.size_in_bytes,
        expiresAt: artifact.expires_at,
        createdAt: artifact.created_at,
        updatedAt: artifact.updated_at,
        expired: artifact.expired
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load artifacts." },
      { status: 500 }
    );
  }
}
