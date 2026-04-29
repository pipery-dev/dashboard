import { NextResponse } from "next/server";
import { z } from "zod";
import { downloadJsonlFromArtifact } from "@/lib/github-api";
import { getGitHubAccessToken } from "@/lib/github";

const querySchema = z.object({
  artifactId: z.string().min(1)
});

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params;
    const query = querySchema.parse({
      artifactId: request.nextUrl.searchParams.get("artifactId")
    });

    const token = await getGitHubAccessToken();
    const jsonlFiles = await downloadJsonlFromArtifact(owner, repo, Number(query.artifactId), token);

    if (jsonlFiles.length === 0) {
      return NextResponse.json(
        { error: "No .jsonl files were found inside this artifact." },
        { status: 404 }
      );
    }

    jsonlFiles.sort((left, right) => Number(right.preferred) - Number(left.preferred));

    return NextResponse.json({
      files: jsonlFiles.map((file) => ({
        path: file.path,
        preferred: file.preferred
      })),
      selectedFile: jsonlFiles[0].path,
      content: jsonlFiles[0].content
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to open artifact." },
      { status: 500 }
    );
  }
}
