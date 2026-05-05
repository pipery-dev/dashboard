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
      name: `__Secure-next-auth.session-token`,
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
