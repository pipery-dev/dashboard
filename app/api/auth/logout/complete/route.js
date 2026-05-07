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
  const response = NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), url.origin));
  expirePiperyAuthCookies(response, request, provider);
  return response;
}
