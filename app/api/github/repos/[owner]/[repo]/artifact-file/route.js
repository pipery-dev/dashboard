import { NextResponse } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { getGitHubClient } from "@/lib/github";

const querySchema = z.object({
  artifactId: z.string().min(1)
});

export async function GET(request, { params }) {
  try {
    const { owner, repo } = await params;
    const query = querySchema.parse({
      artifactId: request.nextUrl.searchParams.get("artifactId")
    });

    const { octokit, token } = await getGitHubClient();
    const artifactResponse = await octokit.rest.actions.getArtifact({
      owner,
      repo,
      artifact_id: Number(query.artifactId)
    });

    const downloadResponse = await fetch(artifactResponse.data.archive_download_url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!downloadResponse.ok) {
      throw new Error("GitHub artifact download failed.");
    }

    const zipBuffer = await downloadResponse.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);
    const jsonlFiles = [];

    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir || !path.toLowerCase().endsWith(".jsonl")) {
        continue;
      }

      const content = await file.async("text");
      jsonlFiles.push({
        path,
        content,
        preferred: path.toLowerCase().endsWith("pipery.jsonl")
      });
    }

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
