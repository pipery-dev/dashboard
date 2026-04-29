export const authOptions = {
  providers: [],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async session({ session, token }) {
      session.accessToken = token.accessToken;
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
  }
};
