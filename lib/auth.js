import GitHubProvider from "next-auth/providers/github";
import GitLabProvider from "next-auth/providers/gitlab";

export const PIPERY_PROVIDERS = ["github", "gitlab", "bitbucket"];

const DEFAULT_SESSION_COOKIE_PREFIX = "__Secure-pipery-auth";

function isSecureAuth() {
  if (process.env.PIPERY_AUTH_SECURE_COOKIES) {
    return process.env.PIPERY_AUTH_SECURE_COOKIES === "true";
  }
  return !process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.startsWith("https://");
}

export function providerSessionCookieName(provider = "github") {
  const fallback = isSecureAuth() ? DEFAULT_SESSION_COOKIE_PREFIX : "pipery-auth";
  return `${process.env.PIPERY_AUTH_SESSION_COOKIE_PREFIX || fallback}.${provider}.session-token`;
}

function sessionCookieOptions() {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isSecureAuth()
  };
  const domain = process.env.PIPERY_AUTH_COOKIE_DOMAIN ?? (process.env.NEXTAUTH_URL?.includes("localhost") ? "" : ".pipery.dev");
  if (domain) {
    options.domain = domain;
  }
  return options;
}

function selectedProvider(provider) {
  if (provider === "gitlab") {
    return GitLabProvider({
      clientId: process.env.GITLAB_CLIENT_ID || "",
      clientSecret: process.env.GITLAB_CLIENT_SECRET || "",
      authorization: { params: { scope: process.env.GITLAB_SCOPE || "read_user api" } }
    });
  }
  if (provider === "bitbucket") {
    return {
      id: "bitbucket",
      name: "Bitbucket Cloud",
      type: "oauth",
      clientId: process.env.BITBUCKET_CLIENT_ID || "",
      clientSecret: process.env.BITBUCKET_CLIENT_SECRET || "",
      authorization: {
        url: "https://bitbucket.org/site/oauth2/authorize",
        params: { scope: process.env.BITBUCKET_SCOPE || "account repository pipeline pullrequest" }
      },
      token: "https://bitbucket.org/site/oauth2/access_token",
      userinfo: "https://api.bitbucket.org/2.0/user",
      profile(profile) {
        return {
          id: profile.account_id || profile.uuid || profile.username,
          name: profile.display_name || profile.nickname || profile.username,
          email: profile.email,
          image: profile.links?.avatar?.href,
          login: profile.username || profile.nickname || profile.account_id
        };
      }
    };
  }
  return GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    authorization: { params: { scope: process.env.GITHUB_SCOPE || "read:user user:email repo workflow" } }
  });
}

function loginForProvider(provider, profile) {
  if (provider === "gitlab") return profile?.username || profile?.nickname || profile?.email || profile?.name;
  if (provider === "bitbucket") return profile?.username || profile?.nickname || profile?.display_name || profile?.account_id;
  return profile?.login || profile?.email || profile?.name;
}

export function authOptionsForProvider(provider = "github") {
  return {
    providers: [selectedProvider(provider)],
    session: { strategy: "jwt" },
    callbacks: {
      async jwt({ token, account, profile }) {
        if (account?.access_token) {
          const login = loginForProvider(provider, profile);
          token.accounts = {
            ...(token.accounts || {}),
            [provider]: {
              accessToken: account.access_token,
              login
            }
          };
          token.accessToken = account.access_token;
          token.provider = provider;
          token.login = login;
        }
        return token;
      },
      async session({ session, token }) {
        session.accounts = token.accounts || {};
        session.provider = token.provider;
        session.accessToken =
          session.provider && session.accounts[session.provider]?.accessToken
            ? session.accounts[session.provider].accessToken
            : token.accessToken;
        session.user.login = token.login;
        return session;
      }
    },
    cookies: {
      sessionToken: {
        name: providerSessionCookieName(provider),
        options: sessionCookieOptions()
      }
    },
    secret: process.env.NEXTAUTH_SECRET
  };
}

export const authOptions = authOptionsForProvider();
