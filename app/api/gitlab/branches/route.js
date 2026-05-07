import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listGitLabBranches } from "@/lib/gitlab-api";

export async function GET(request) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "Missing projectId." }, { status: 400 });

    const token = await getProviderAccessToken("gitlab");
    return NextResponse.json({ branches: await listGitLabBranches(projectId, token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load GitLab branches." }, { status: 500 });
  }
}
