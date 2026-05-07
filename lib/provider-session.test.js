import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn()
}));

import { getServerSession } from "next-auth";
import { getPiperySession } from "./provider-session";

describe("getPiperySession", () => {
  it("returns provider connection state without exposing access tokens", async () => {
    getServerSession
      .mockResolvedValueOnce({
        provider: "github",
        accessToken: "github-token",
        accounts: { github: { accessToken: "github-token", login: "octo" } },
        user: { login: "octo" }
      })
      .mockResolvedValueOnce({
        provider: "gitlab",
        accessToken: "gitlab-token",
        accounts: { gitlab: { accessToken: "gitlab-token", login: "tanuki" } },
        user: { login: "tanuki" }
      })
      .mockResolvedValueOnce(null);

    const session = await getPiperySession();

    expect(session).toEqual({
      provider: "github",
      accounts: {
        github: { authenticated: true, login: "octo" },
        gitlab: { authenticated: true, login: "tanuki" }
      },
      user: { login: "octo" }
    });
    expect(JSON.stringify(session)).not.toContain("github-token");
    expect(JSON.stringify(session)).not.toContain("gitlab-token");
  });

  it("returns null when no provider has a token", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(getPiperySession()).resolves.toBeNull();
  });
});
