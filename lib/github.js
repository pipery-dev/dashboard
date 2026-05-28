import { getProviderSession } from "@/lib/provider-session";

export async function getGitHubAccessToken() {
  await getProviderSession("dex");
  throw new Error("GitHub API access is not available from Dex sessions yet.");
}

export async function getProviderAccessToken(provider) {
  await getProviderSession("dex");
  const label = provider === "gitlab" ? "GitLab" : provider === "bitbucket" ? "Bitbucket" : "GitHub";
  throw new Error(`${label} API access is not available from Dex sessions yet.`);
}
