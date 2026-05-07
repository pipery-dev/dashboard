import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listGitLabProjects } from "@/lib/gitlab-api";

export async function GET() {
  try {
    const token = await getProviderAccessToken("gitlab");
    return NextResponse.json({ repos: await listGitLabProjects(token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load GitLab projects." }, { status: 500 });
  }
}
