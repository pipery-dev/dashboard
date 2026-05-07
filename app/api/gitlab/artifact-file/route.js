import { NextResponse } from "next/server";
import { getProviderAccessToken } from "@/lib/github";
import { downloadGitLabJsonlArtifact } from "@/lib/gitlab-api";

export async function GET(request) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    const jobId = request.nextUrl.searchParams.get("jobId");
    if (!projectId || !jobId) return NextResponse.json({ error: "Missing projectId or jobId." }, { status: 400 });

    const token = await getProviderAccessToken("gitlab");
    const jsonlFiles = await downloadGitLabJsonlArtifact(projectId, jobId, token);
    if (!jsonlFiles.length) {
      return NextResponse.json({ error: "No .jsonl files were found inside this artifact." }, { status: 404 });
    }

    return NextResponse.json({
      files: jsonlFiles.map((file) => ({ path: file.path, preferred: file.preferred })),
      selectedFile: jsonlFiles[0].path,
      content: jsonlFiles[0].content
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to open GitLab artifact." }, { status: 500 });
  }
}
