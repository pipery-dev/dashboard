import { NextResponse } from "next/server";
import { PIPERY_PROVIDERS } from "@/lib/auth";
import { expirePiperyAuthCookies } from "@/lib/logout-cookies";

function safeNextPath(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request) {
  const url = new URL(request.url);
  const providerParam = url.searchParams.get("provider");
  const provider = PIPERY_PROVIDERS.includes(providerParam) ? providerParam : undefined;
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const completeUrl = new URL("/api/auth/logout/complete", url.origin);
  completeUrl.searchParams.set("next", nextPath);
  if (provider) {
    completeUrl.searchParams.set("provider", provider);
  }

  const authLogoutUrl = new URL("/api/auth/logout", process.env.PIPERY_AUTH_URL || "https://auth.pipery.dev");
  authLogoutUrl.searchParams.set("callbackUrl", completeUrl.toString());
  if (provider) {
    authLogoutUrl.searchParams.set("provider", provider);
  }

  const response = NextResponse.redirect(authLogoutUrl);
  expirePiperyAuthCookies(response, request, provider);
  return response;
}
