export const PIPERY_PROVIDERS = ["dex"];

const DEFAULT_SESSION_COOKIE_PREFIX = "__Secure-pipery-auth";

function isSecureAuth() {
  if (process.env.PIPERY_AUTH_SECURE_COOKIES) {
    return process.env.PIPERY_AUTH_SECURE_COOKIES === "true";
  }
  return !process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.startsWith("https://");
}

export function providerSessionCookieName(provider = "dex") {
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

function dexProvider() {
  const issuer = process.env.DEX_ISSUER || "https://auth.pipery.dev/dex";
  return {
    id: "dex",
    name: "Pipery",
    type: "oauth",
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: { params: { scope: process.env.DEX_SCOPE || "openid profile email" } },
    idToken: true,
    clientId: process.env.DEX_CLIENT_ID || "pipery-dashboard",
    clientSecret: process.env.DEX_CLIENT_SECRET || "",
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name || profile.preferred_username || profile.email,
        email: profile.email,
        image: profile.picture,
        login: profile.preferred_username || profile.email || profile.sub
      };
    }
  };
}

export function authOptionsForProvider(provider = "dex") {
  return {
    providers: [dexProvider()],
    session: { strategy: "jwt" },
    callbacks: {
      async jwt({ token, account, profile }) {
        if (account?.access_token) {
          const login = profile?.preferred_username || profile?.email || profile?.name || profile?.sub;
          token.accounts = {
            ...(token.accounts || {}),
            dex: {
              accessToken: account.access_token,
              login
            }
          };
          token.accessToken = account.access_token;
          token.provider = "dex";
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
