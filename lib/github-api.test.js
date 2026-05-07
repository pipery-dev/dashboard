import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  downloadJsonlFromArtifact,
  getCurrentUser,
  listArtifacts,
  listBranches,
  listRepos,
  listRuns,
  listWorkflows
} from "./github-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GitHub API helpers", () => {
  it("maps authenticated requests to the GitHub API headers", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ login: "octocat" })
    );

    await expect(getCurrentUser("token-123")).resolves.toEqual({ login: "octocat" });

    expect(fetch).toHaveBeenCalledWith("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: "Bearer token-123"
      }
    });
  });

  it("throws GitHub response messages for failed JSON requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ message: "Bad credentials" }, { status: 401 })
    );

    await expect(listRepos("bad-token")).rejects.toThrow("Bad credentials");
  });

  it("normalizes repository records for the repository picker", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json([
        {
          id: 42,
          name: "service",
          full_name: "team/service",
          owner: { login: "team" },
          private: true,
          default_branch: "trunk",
          updated_at: "2026-05-01T00:00:00Z",
          html_url: "https://github.com/team/service"
        }
      ])
    );

    await expect(listRepos("token")).resolves.toEqual([
      {
        id: 42,
        name: "service",
        fullName: "team/service",
        owner: "team",
        private: true,
        defaultBranch: "trunk",
        updatedAt: "2026-05-01T00:00:00Z",
        url: "https://github.com/team/service"
      }
    ]);
  });

  it("normalizes branches, workflows, runs, and artifacts for dashboard views", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        Response.json([
          { name: "main", protected: true },
          { name: "feature", protected: false }
        ])
      )
      .mockResolvedValueOnce(
        Response.json({
          workflows: [
            { id: 10, name: "CI", path: ".github/workflows/ci.yml", state: "active" }
          ]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          workflow_runs: [
            {
              id: 99,
              name: "CI",
              display_title: "Build main",
              event: "push",
              status: "completed",
              conclusion: "success",
              created_at: "2026-05-01T00:00:00Z",
              updated_at: "2026-05-01T00:02:00Z",
              html_url: "https://github.com/team/service/actions/runs/99"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          artifacts: [
            {
              id: 7,
              name: "logs",
              size_in_bytes: 1234,
              expires_at: "2026-06-01T00:00:00Z",
              created_at: "2026-05-01T00:01:00Z",
              updated_at: "2026-05-01T00:01:30Z",
              expired: false
            }
          ]
        })
      );

    await expect(listBranches("team", "service", "token")).resolves.toEqual([
      { name: "main", protected: true },
      { name: "feature", protected: false }
    ]);
    await expect(listWorkflows("team", "service", "token")).resolves.toEqual([
      { id: 10, name: "CI", path: ".github/workflows/ci.yml", state: "active" }
    ]);
    await expect(listRuns("team", "service", "10", "main", "token")).resolves.toEqual([
      {
        id: 99,
        name: "CI",
        displayTitle: "Build main",
        event: "push",
        status: "completed",
        conclusion: "success",
        createdAt: "2026-05-01T00:00:00Z",
        updatedAt: "2026-05-01T00:02:00Z",
        htmlUrl: "https://github.com/team/service/actions/runs/99"
      }
    ]);
    await expect(listArtifacts("team", "service", "99", "token")).resolves.toEqual([
      {
        id: 7,
        name: "logs",
        sizeInBytes: 1234,
        expiresAt: "2026-06-01T00:00:00Z",
        createdAt: "2026-05-01T00:01:00Z",
        updatedAt: "2026-05-01T00:01:30Z",
        expired: false
      }
    ]);

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      3,
      "https://api.github.com/repos/team/service/actions/workflows/10/runs?branch=main&per_page=50",
      expect.any(Object)
    );
  });

  it("extracts pipery.jsonl first from an artifact zip", async () => {
    const zip = new JSZip();
    zip.file("logs/other.JSONL", "{}\n");
    zip.file("nested/");
    zip.file("pipery.jsonl", "{\"step\":\"build\"}\n");
    const body = await zip.generateAsync({ type: "arraybuffer" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(body));

    const files = await downloadJsonlFromArtifact("team", "service", "7", "token");

    expect(files).toEqual([
      { path: "pipery.jsonl", content: "{\"step\":\"build\"}\n", preferred: true },
      { path: "logs/other.JSONL", content: "{}\n", preferred: false }
    ]);
  });

  it("reports artifact download failures and missing jsonl files", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("download expired", { status: 410 })
    );

    await expect(downloadJsonlFromArtifact("team", "service", "7", "token")).rejects.toThrow(
      "download expired"
    );

    const zip = new JSZip();
    zip.file("readme.txt", "no logs here");
    const body = await zip.generateAsync({ type: "arraybuffer" });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(body));

    await expect(downloadJsonlFromArtifact("team", "service", "8", "token")).rejects.toThrow(
      "No .jsonl files were found inside the selected artifact."
    );
  });
});
