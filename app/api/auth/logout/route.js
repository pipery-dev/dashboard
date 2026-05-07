import { NextResponse } from "next/server";
import { expirePiperyAuthCookies } from "@/lib/logout-cookies";

function safeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request) {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const completeUrl = new URL("/api/auth/logout/complete", url.origin);
  completeUrl.searchParams.set("next", nextPath);

  const authLogoutUrl = new URL("/api/auth/logout", process.env.PIPERY_AUTH_URL || "https://auth.pipery.dev");
  authLogoutUrl.searchParams.set("callbackUrl", completeUrl.toString());
  authLogoutUrl.searchParams.set("provider", "github");

  const response = NextResponse.redirect(authLogoutUrl);
  expirePiperyAuthCookies(response, request);
  return response;
}
