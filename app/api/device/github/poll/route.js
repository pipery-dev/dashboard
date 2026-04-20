import { NextResponse } from "next/server";

const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

export async function POST(request) {
  try {
    const clientId = process.env.GITHUB_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "GitHub device flow is not configured on this deployment." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const deviceCode = body?.deviceCode;

    if (!deviceCode) {
      return NextResponse.json({ error: "deviceCode is required." }, { status: 400 });
    }

    const response = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code"
      })
    });

    const payload = await response.json();

    if (payload.error === "authorization_pending") {
      return NextResponse.json({ status: "pending" });
    }

    if (payload.error === "slow_down") {
      return NextResponse.json({ status: "slow_down" });
    }

    if (payload.error) {
      return NextResponse.json(
        {
          error: payload.error_description || payload.error || "Unable to complete GitHub device flow."
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "approved",
      accessToken: payload.access_token,
      scope: payload.scope,
      tokenType: payload.token_type
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to complete GitHub device flow." },
      { status: 500 }
    );
  }
}
