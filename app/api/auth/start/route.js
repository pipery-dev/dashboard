import { createHmac, randomUUID } from "crypto";
import { NextResponse } from "next/server";

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function signedState(payload, secret) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
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
  const providerParam = url.searchParams.get("provider");
  const provider = PROVIDERS.includes(providerParam) ? providerParam : "github";
  const clientId = process.env.PIPERY_AUTH_CLIENT_ID || "pipery-dashboard";
  const stateSecret = process.env.PIPERY_AUTH_STATE_SECRET || "";

  if (!stateSecret) {
    return NextResponse.json({ error: "PIPERY_AUTH_STATE_SECRET is not configured." }, { status: 500 });
  }

  const callbackUrl = safeCallbackUrl(url.searchParams.get("callbackUrl"), url.origin);
  const payload = {
    clientId,
    provider,
    callbackUrl,
    nonce: randomUUID(),
    issuedAt: Date.now()
  };

  const authUrl = new URL(process.env.PIPERY_AUTH_URL || "https://auth.pipery.dev");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("provider", provider);
  authUrl.searchParams.set("callbackUrl", callbackUrl);
  authUrl.searchParams.set("state", signedState(payload, stateSecret));

  return NextResponse.redirect(authUrl);
}
const PROVIDERS = ["github", "gitlab", "bitbucket"];
