import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listGitLabJobs } from "@/lib/gitlab-api";

export async function GET(request) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    const pipelineId = request.nextUrl.searchParams.get("pipelineId");
    if (!projectId || !pipelineId) return NextResponse.json({ error: "Missing projectId or pipelineId." }, { status: 400 });

    const token = await getProviderAccessToken("gitlab");
    return NextResponse.json({ artifacts: await listGitLabJobs(projectId, pipelineId, token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load GitLab jobs." }, { status: 500 });
  }
}
