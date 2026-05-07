import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadGitLabJsonlArtifact, listGitLabJobs, listGitLabProjects } from "./gitlab-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GitLab API helpers", () => {
  it("normalizes project records for the repository picker", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json([
        {
          id: 42,
          name: "service",
          path_with_namespace: "team/service",
          namespace: { full_path: "team" },
          visibility: "private",
          default_branch: "trunk",
          last_activity_at: "2026-05-01T00:00:00Z",
          web_url: "https://gitlab.com/team/service"
        }
      ])
    );

    await expect(listGitLabProjects("token")).resolves.toEqual([
      {
        id: "42",
        name: "service",
        fullName: "team/service",
        owner: "team",
        private: true,
        defaultBranch: "trunk",
        updatedAt: "2026-05-01T00:00:00Z",
        url: "https://gitlab.com/team/service"
      }
    ]);
  });

  it("only exposes jobs that have downloadable artifacts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json([
        {
          id: 1,
          name: "build",
          stage: "test",
          status: "success",
          created_at: "2026-05-01T00:00:00Z",
          finished_at: "2026-05-01T00:01:00Z",
          web_url: "https://gitlab.com/job/1",
          artifacts_file: { filename: "artifacts.zip" }
        },
        {
          id: 2,
          name: "lint",
          artifacts_file: null
        }
      ])
    );

    const jobs = await listGitLabJobs("42", "99", "token");

    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ id: 1, name: "build", status: "success" });
  });

  it("extracts pipery.jsonl first from a GitLab artifact zip", async () => {
    const zip = new JSZip();
    zip.file("logs/other.jsonl", "{}\n");
    zip.file("pipery.jsonl", "{\"step\":\"build\"}\n");
    const body = await zip.generateAsync({ type: "arraybuffer" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(body));

    const files = await downloadGitLabJsonlArtifact("42", "1", "token");

    expect(files).toEqual([
      { path: "pipery.jsonl", content: "{\"step\":\"build\"}\n", preferred: true },
      { path: "logs/other.jsonl", content: "{}\n", preferred: false }
    ]);
  });
});
