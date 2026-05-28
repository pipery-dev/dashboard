import { NextResponse } from "next/server";

function publicOrigin(requestOrigin) {
  return process.env.NEXTAUTH_URL || requestOrigin;
}

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
  const origin = publicOrigin(url.origin);
  const callbackUrl = safeCallbackUrl(url.searchParams.get("callbackUrl"), origin);
  const authUrl = new URL("/api/auth/signin/dex", origin);
  authUrl.searchParams.set("callbackUrl", callbackUrl);

  return NextResponse.redirect(authUrl);
}
