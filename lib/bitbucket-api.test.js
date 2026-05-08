import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadBitbucketJsonlArtifact,
  listBitbucketDownloads,
  listBitbucketPipelines,
  listBitbucketRepos
} from "./bitbucket-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Bitbucket API helpers", () => {
  it("normalizes repository records and follows paginated responses", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json({
          values: [{ workspace: { slug: "team" } }],
          next: "https://api.bitbucket.org/2.0/user/workspaces?page=2"
        })
      )
      .mockResolvedValueOnce(Response.json({ values: [{ workspace: { slug: "tools" } }] }))
      .mockResolvedValueOnce(
        Response.json({
          values: [
            {
              uuid: "{repo-1}",
              slug: "app",
              full_name: "team/app",
              workspace: { slug: "team" },
              is_private: true,
              mainbranch: { name: "main" },
              updated_on: "2026-05-01T00:00:00Z",
              links: { html: { href: "https://bitbucket.org/team/app" } }
            }
          ],
          next: "https://api.bitbucket.org/2.0/repositories/team?role=member&page=2"
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          values: [
            {
              slug: "api",
              full_name: "team/api",
              workspace: { slug: "team" },
              is_private: false,
              updated_on: "2026-05-02T00:00:00Z",
              links: { html: { href: "https://bitbucket.org/team/api" } }
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          values: [
            {
              uuid: "{repo-3}",
              slug: "worker",
              full_name: "tools/worker",
              workspace: { slug: "tools" },
              is_private: true,
              mainbranch: { name: "develop" },
              updated_on: "2026-04-30T00:00:00Z",
              links: { html: { href: "https://bitbucket.org/tools/worker" } }
            }
          ]
        })
      );

    const repos = await listBitbucketRepos("token");

    expect(repos.map((repo) => repo.fullName)).toEqual(["team/api", "team/app", "tools/worker"]);
    expect(repos[0]).toMatchObject({
      id: "team/api",
      owner: "team",
      defaultBranch: "main",
      workspace: "team",
      slug: "api"
    });
  });

  it("normalizes pipeline state for dashboard rows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        values: [
          {
            uuid: "{pipeline-1}",
            build_number: 12,
            trigger: { name: "push" },
            state: { name: "COMPLETED", result: { name: "SUCCESSFUL" } },
            created_on: "2026-05-01T00:00:00Z",
            completed_on: "2026-05-01T00:02:00Z",
            links: { html: { href: "https://bitbucket.org/team/app/pipelines/12" } }
          }
        ]
      })
    );

    await expect(listBitbucketPipelines("team", "app", "main", "token")).resolves.toEqual([
      {
        id: "{pipeline-1}",
        name: "Pipeline #12",
        displayTitle: "Pipeline #12",
        event: "push",
        status: "SUCCESSFUL",
        conclusion: "SUCCESSFUL",
        createdAt: "2026-05-01T00:00:00Z",
        updatedAt: "2026-05-01T00:02:00Z",
        htmlUrl: "https://bitbucket.org/team/app/pipelines/12"
      }
    ]);
  });

  it("only lists jsonl and zip downloads as dashboard artifacts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({
        values: [
          { name: "pipery.jsonl", size: 50, created_on: "2026-05-01T00:00:00Z" },
          { name: "logs.zip", size: 100, created_on: "2026-05-02T00:00:00Z" },
          { name: "readme.txt", size: 10, created_on: "2026-05-03T00:00:00Z" }
        ]
      })
    );

    const downloads = await listBitbucketDownloads("team", "app", "token");

    expect(downloads.map((download) => download.name)).toEqual(["pipery.jsonl", "logs.zip"]);
  });

  it("extracts pipery.jsonl first from a Bitbucket zip download", async () => {
    const zip = new JSZip();
    zip.file("nested/other.jsonl", "{}\n");
    zip.file("pipery.jsonl", "{\"step\":\"test\"}\n");
    const body = await zip.generateAsync({ type: "arraybuffer" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(body));

    const files = await downloadBitbucketJsonlArtifact("team", "app", "logs.zip", "token");

    expect(files).toEqual([
      { path: "pipery.jsonl", content: "{\"step\":\"test\"}\n", preferred: true },
      { path: "nested/other.jsonl", content: "{}\n", preferred: false }
    ]);
  });
});
