import { NextResponse } from "next/server";

function safeCallbackUrl(value, origin) {
  if (!value) return origin;

  try {
    const url = new URL(value);
    if (url.origin === origin) return url.toString();
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return new URL(value, origin).toString();
    }
  }

  return origin;
}

export async function GET(request) {
  const url = new URL(request.url);
  const providerParam = url.searchParams.get("provider");
  const provider = PROVIDERS.includes(providerParam) ? providerParam : "github";
  const callbackUrl = safeCallbackUrl(url.searchParams.get("callbackUrl"), url.origin);
  const authUrl = new URL(`/api/auth/signin/${provider}`, url.origin);
  authUrl.searchParams.set("callbackUrl", callbackUrl);
  authUrl.searchParams.set("provider", provider);

  return NextResponse.redirect(authUrl);
}
const PROVIDERS = ["github", "gitlab", "bitbucket"];
