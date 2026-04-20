import { NextResponse } from "next/server";
import { z } from "zod";
import { listArtifacts } from "@pipery/core/github";
import { getGitHubAccessToken } from "@/lib/github";

const querySchema = z.object({
  runId: z.string().min(1)
});

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params;
    const query = querySchema.parse({
      runId: request.nextUrl.searchParams.get("runId")
    });

    const token = await getGitHubAccessToken();
    return NextResponse.json({
      artifacts: await listArtifacts(owner, repo, Number(query.runId), token)
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load artifacts." },
      { status: 500 }
    );
  }
}
