import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listBitbucketPipelines } from "@/lib/bitbucket-api";

export async function GET(request) {
  try {
    const workspace = request.nextUrl.searchParams.get("workspace");
    const repo = request.nextUrl.searchParams.get("repo");
    const branch = request.nextUrl.searchParams.get("branch");
    if (!workspace || !repo || !branch) return NextResponse.json({ error: "Missing workspace, repo, or branch." }, { status: 400 });

    const token = await getProviderAccessToken("bitbucket");
    return NextResponse.json({ runs: await listBitbucketPipelines(workspace, repo, branch, token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load Bitbucket pipelines." }, { status: 500 });
  }
}
