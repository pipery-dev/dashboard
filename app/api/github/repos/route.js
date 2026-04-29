import { NextResponse } from "next/server";
import { listRepos } from "@/lib/github-api";
import { getGitHubAccessToken } from "@/lib/github";

export async function GET() {
  try {
    const token = await getGitHubAccessToken();
    return NextResponse.json({ repos: await listRepos(token) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load repositories." },
      { status: 500 }
    );
  }
}
