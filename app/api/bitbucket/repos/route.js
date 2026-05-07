import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { listBitbucketRepos } from "@/lib/bitbucket-api";

export async function GET() {
  try {
    const token = await getProviderAccessToken("bitbucket");
    return NextResponse.json({ repos: await listBitbucketRepos(token) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load Bitbucket repositories." }, { status: 500 });
  }
}
