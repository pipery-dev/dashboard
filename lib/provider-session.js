import { getServerSession } from "next-auth";
import { authOptionsForProvider, PIPERY_PROVIDERS } from "./auth";

export async function getProviderSession(provider) {
  return getServerSession(authOptionsForProvider(provider));
}

function publicAccount(account) {
  if (!account?.accessToken) return null;
  return {
    authenticated: true,
    login: account.login
  };
}

export async function getPiperySession() {
  const providerSessions = await Promise.all(
    PIPERY_PROVIDERS.map(async (provider) => ({
      provider,
      session: await getProviderSession(provider)
    }))
  );

  const accounts = {};
  let activeProvider;
  let user = {};

  for (const { provider, session } of providerSessions) {
    const account = session?.accounts?.[provider] || (session?.accessToken ? { accessToken: session.accessToken, login: session.user?.login } : undefined);
    if (!account?.accessToken) continue;

    accounts[provider] = publicAccount(account);
    activeProvider = activeProvider || provider;
    user = user.login ? user : session?.user || {};
  }

  if (!Object.keys(accounts).length) {
    return null;
  }

  return {
    provider: activeProvider,
    accounts,
    user
  };
}
