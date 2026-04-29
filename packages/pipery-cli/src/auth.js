import { loadConfig, saveConfig, clearConfig } from "./storage.js";

const AUTH_URL =
  process.env.PIPERY_AUTH_URL?.replace(/\/+$/, "") || "https://auth.pipery.dev";

async function postJson(pathname, body) {
  const response = await fetch(`${AUTH_URL}${pathname}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed for ${pathname}`);
  }

  return payload;
}

export async function login() {
  const deviceCode = await postJson("/api/device/github/start");

  console.log("\nGitHub login");
  console.log(`1. Open ${deviceCode.verificationUri}`);
  console.log(`2. Enter code: ${deviceCode.userCode}`);
  console.log(`3. Authorize the Pipery CLI via ${AUTH_URL}.\n`);

  const deadline = Date.now() + deviceCode.expiresIn * 1000;
  let pollIntervalMs = deviceCode.interval * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const tokenResponse = await postJson("/api/device/github/poll", {
      deviceCode: deviceCode.deviceCode
    });

    if (tokenResponse.status === "pending") {
      continue;
    }

    if (tokenResponse.status === "slow_down") {
      pollIntervalMs += 5000;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    const config = await loadConfig();
    await saveConfig({
      ...config,
      githubToken: tokenResponse.accessToken
    });

    return tokenResponse.accessToken;
  }

  throw new Error("GitHub login timed out before authorization completed.");
}

export async function getSavedToken() {
  const config = await loadConfig();
  return config.githubToken || "";
}

export async function requireToken() {
  const token = await getSavedToken();
  if (!token) {
    throw new Error("You are not logged in. Run `pipery login` first.");
  }

  return token;
}

export async function logout() {
  await clearConfig();
}
