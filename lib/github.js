import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getGitHubAccessToken() {
  const session = await getServerSession(authOptions);
  const token =
    session?.accounts?.github?.accessToken ||
    (session?.provider === "github" ? session?.accessToken : undefined) ||
    (!session?.provider ? session?.accessToken : undefined);

  if (!token) {
    throw new Error("No GitHub access token is available. Sign in again and retry.");
  }

  return token;
}
