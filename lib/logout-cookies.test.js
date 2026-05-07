import { NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import { expirePiperyAuthCookies } from "./logout-cookies";

function cookieNames(response) {
  return response.headers.getSetCookie().map((cookie) => cookie.split("=")[0]);
}

describe("expirePiperyAuthCookies", () => {
  it("expires only the requested provider cookie plus shared legacy cookies", () => {
    const response = NextResponse.json({});
    const request = new Request("https://dash.pipery.dev/api/auth/logout?provider=github", {
      headers: {
        cookie:
          "__Secure-pipery-auth.github.session-token=one; __Secure-pipery-auth.gitlab.session-token=two; __Secure-next-auth.session-token=legacy"
      }
    });

    expirePiperyAuthCookies(response, request, "github");

    const names = cookieNames(response);
    expect(names).toContain("__Secure-pipery-auth.github.session-token");
    expect(names).toContain("__Secure-next-auth.session-token");
    expect(names).not.toContain("__Secure-pipery-auth.gitlab.session-token");
  });

  it("expires every provider cookie when logging out from all accounts", () => {
    const response = NextResponse.json({});
    const request = new Request("https://dash.pipery.dev/api/auth/logout", {
      headers: {
        cookie:
          "__Secure-pipery-auth.github.session-token=one; __Secure-pipery-auth.gitlab.session-token=two; __Secure-pipery-auth.bitbucket.session-token=three"
      }
    });

    expirePiperyAuthCookies(response, request);

    const names = cookieNames(response);
    expect(names).toContain("__Secure-pipery-auth.github.session-token");
    expect(names).toContain("__Secure-pipery-auth.gitlab.session-token");
    expect(names).toContain("__Secure-pipery-auth.bitbucket.session-token");
  });

  it("does not attach a Domain attribute to host-only cookies", () => {
    const response = NextResponse.json({});
    const request = new Request("https://dash.pipery.dev/api/auth/logout", {
      headers: {
        cookie: "__Host-pipery-auth.csrf-token=csrf"
      }
    });

    expirePiperyAuthCookies(response, request, "github");

    const hostCookies = response.headers
      .getSetCookie()
      .filter((cookie) => cookie.startsWith("__Host-pipery-auth.csrf-token="));
    expect(hostCookies.length).toBe(1);
    expect(hostCookies[0]).not.toContain("Domain=");
  });
});
