const githubSessionCookieName = `${process.env.PIPERY_AUTH_SESSION_COOKIE_PREFIX || "__Secure-pipery-auth"}.github.session-token`;

export const authOptions = {
  providers: [],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      session.accounts = token.accounts || {};
      session.provider = token.provider;
      session.accessToken =
        session.accounts.github?.accessToken ||
        (session.provider === "github" ? token.accessToken : undefined);
      session.user.login = token.login;
      return session;
    }
  },
  cookies: {
    sessionToken: {
      name: githubSessionCookieName,
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
