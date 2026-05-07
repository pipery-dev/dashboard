import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { downloadBitbucketJsonlArtifact } from "@/lib/bitbucket-api";

export async function GET(request) {
  try {
    const workspace = request.nextUrl.searchParams.get("workspace");
    const repo = request.nextUrl.searchParams.get("repo");
    const name = request.nextUrl.searchParams.get("name");
    if (!workspace || !repo || !name) return NextResponse.json({ error: "Missing workspace, repo, or name." }, { status: 400 });

    const token = await getProviderAccessToken("bitbucket");
    const jsonlFiles = await downloadBitbucketJsonlArtifact(workspace, repo, name, token);
    if (!jsonlFiles.length) {
      return NextResponse.json({ error: "No .jsonl files were found inside this artifact." }, { status: 404 });
    }

    return NextResponse.json({
      files: jsonlFiles.map((file) => ({ path: file.path, preferred: file.preferred })),
      selectedFile: jsonlFiles[0].path,
      content: jsonlFiles[0].content
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to open Bitbucket artifact." }, { status: 500 });
  }
}
