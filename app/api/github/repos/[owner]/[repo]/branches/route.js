import { NextResponse } from "next/server";
import { listBranches } from "@/lib/github-api";
import { getGitHubAccessToken } from "@/lib/github";

export async function GET(_, { params }) {
  try {
    const { owner, repo } = await params;
    const token = await getGitHubAccessToken();
    return NextResponse.json({ branches: await listBranches(owner, repo, token) });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to load branches." },
      { status: 500 }
    );
  }
}
