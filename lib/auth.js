export const PIPERY_PROVIDERS = ["github", "gitlab", "bitbucket"];

const DEFAULT_SESSION_COOKIE_PREFIX = "__Secure-pipery-auth";

export function providerSessionCookieName(provider) {
  return `${process.env.PIPERY_AUTH_SESSION_COOKIE_PREFIX || DEFAULT_SESSION_COOKIE_PREFIX}.${provider}.session-token`;
}

export function authOptionsForProvider(provider = "github") {
  return {
    providers: [],
    session: { strategy: "jwt" },
    callbacks: {
      async jwt({ token }) {
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
        options: {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: true,
          domain: ".pipery.dev"
        }
      }
    },
    secret: process.env.NEXTAUTH_SECRET
  };
}

export const authOptions = authOptionsForProvider("github");
