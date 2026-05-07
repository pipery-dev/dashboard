import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listGitLabPipelines } from "@/lib/gitlab-api";

export async function GET(request) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    const branch = request.nextUrl.searchParams.get("branch");
    if (!projectId || !branch) return NextResponse.json({ error: "Missing projectId or branch." }, { status: 400 });

    const token = await getProviderAccessToken("gitlab");
    return NextResponse.json({ runs: await listGitLabPipelines(projectId, branch, token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load GitLab pipelines." }, { status: 500 });
  }
}
