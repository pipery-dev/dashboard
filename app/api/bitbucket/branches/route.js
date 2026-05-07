import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listBitbucketBranches } from "@/lib/bitbucket-api";

export async function GET(request) {
  try {
    const workspace = request.nextUrl.searchParams.get("workspace");
    const repo = request.nextUrl.searchParams.get("repo");
    if (!workspace || !repo) return NextResponse.json({ error: "Missing workspace or repo." }, { status: 400 });

    const token = await getProviderAccessToken("bitbucket");
    return NextResponse.json({ branches: await listBitbucketBranches(workspace, repo, token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load Bitbucket branches." }, { status: 500 });
  }
}
