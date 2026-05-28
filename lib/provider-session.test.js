import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn()
}));

import { getServerSession } from "next-auth";
import { getPiperySession } from "./provider-session";

describe("getPiperySession", () => {
  it("returns provider connection state without exposing access tokens", async () => {
    getServerSession.mockResolvedValueOnce({
      provider: "dex",
      accessToken: "dex-token",
      accounts: { dex: { accessToken: "dex-token", login: "octo" } },
      user: { login: "octo" }
    });

    const session = await getPiperySession();

    expect(session).toEqual({
      provider: "dex",
      accounts: {
        dex: { authenticated: true, login: "octo" }
      },
      user: { login: "octo" }
    });
    expect(JSON.stringify(session)).not.toContain("dex-token");
  });

  it("returns null when no provider has a token", async () => {
    getServerSession.mockResolvedValue(null);

    await expect(getPiperySession()).resolves.toBeNull();
  });
});
