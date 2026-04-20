import { NextResponse } from "next/server";

const DEVICE_CODE_URL = "https://github.com/login/device/code";

export async function POST() {
  try {
    const clientId = process.env.GITHUB_ID;

    if (!clientId) {
      return NextResponse.json(
        { error: "GitHub device flow is not configured on this deployment." },
        { status: 500 }
      );
    }

    const response = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "read:user repo"
      })
    });

    const payload = await response.json();

    if (!response.ok || payload.error) {
      return NextResponse.json(
        {
          error: payload.error_description || payload.error || "Unable to start GitHub device flow."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deviceCode: payload.device_code,
      userCode: payload.user_code,
      verificationUri: payload.verification_uri,
      expiresIn: payload.expires_in,
      interval: payload.interval
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Unable to start GitHub device flow." },
      { status: 500 }
    );
  }
}
