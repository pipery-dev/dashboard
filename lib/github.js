import { getServerSession } from "next-auth";
import { Octokit } from "@octokit/rest";
import { authOptions } from "@/lib/auth";

export async function getGitHubClient() {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;

  if (!token) {
    throw new Error("No GitHub access token is available. Sign in again and retry.");
  }

  return {
    token,
    octokit: new Octokit({
      auth: token
    })
  };
}

export async function getAuthenticatedOctokit() {
  const { octokit } = await getGitHubClient();
  return octokit;
}
