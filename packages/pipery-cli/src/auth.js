import { loadConfig, saveConfig, clearConfig } from "./storage.js";

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";

function githubClientId() {
  const clientId = process.env.PIPERY_CLI_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error("Set PIPERY_CLI_GITHUB_CLIENT_ID to enable CLI login.");
  }
  return clientId;
}

async function postGitHubJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || `Request failed for ${url}`);
  }

  return payload;
}

export async function login() {
  const deviceCode = await postGitHubJson(GITHUB_DEVICE_CODE_URL, {
    client_id: githubClientId(),
    scope: "repo workflow read:user user:email"
  });

  console.log("\nGitHub login");
  console.log(`1. Open ${deviceCode.verification_uri}`);
  console.log(`2. Enter code: ${deviceCode.user_code}`);
  console.log("3. Authorize the Pipery CLI.\n");

  const deadline = Date.now() + deviceCode.expires_in * 1000;
  let pollIntervalMs = deviceCode.interval * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

    const tokenResponse = await postGitHubJson(GITHUB_ACCESS_TOKEN_URL, {
      client_id: githubClientId(),
      device_code: deviceCode.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code"
    });

    if (tokenResponse.error === "authorization_pending") {
      continue;
    }

    if (tokenResponse.error === "slow_down") {
      pollIntervalMs += 5000;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      continue;
    }

    if (tokenResponse.error) {
      throw new Error(tokenResponse.error_description || tokenResponse.error);
    }

    const config = await loadConfig();
    await saveConfig({
      ...config,
      githubToken: tokenResponse.access_token
    });

    return tokenResponse.access_token;
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
