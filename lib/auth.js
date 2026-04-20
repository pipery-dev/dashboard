import GitHubProvider from "next-auth/providers/github";

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      authorization: {
        params: {
          scope: "read:user repo"
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }

      if (profile?.login) {
        token.login = profile.login;
      }

      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.login = token.login;
      return session;
    }
  }
};
