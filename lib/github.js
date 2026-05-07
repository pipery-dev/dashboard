import { getProviderSession } from "@/lib/provider-session";

export async function getGitHubAccessToken() {
  const session = await getProviderSession("github");
  const token =
    session?.accounts?.github?.accessToken ||
    (session?.provider === "github" ? session?.accessToken : undefined);

  if (!token) {
    throw new Error("No GitHub access token is available. Sign in again and retry.");
  }

  return token;
}

export async function getProviderAccessToken(provider) {
  const session = await getProviderSession(provider);
  const token =
    session?.accounts?.[provider]?.accessToken ||
    (session?.provider === provider ? session?.accessToken : undefined);

  if (!token) {
    const label = provider === "gitlab" ? "GitLab" : provider === "bitbucket" ? "Bitbucket" : "GitHub";
    throw new Error(`No ${label} access token is available. Sign in again and retry.`);
  }

  return token;
}
