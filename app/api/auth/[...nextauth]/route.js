import NextAuth from "next-auth";
import { authOptionsForProvider, PIPERY_PROVIDERS } from "@/lib/auth";

function providerFromRequest(request) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || url.pathname.split("/").pop();

  if (PIPERY_PROVIDERS.includes(provider)) {
    return provider;
  }

  return "github";
}

function handler(request, context) {
  return NextAuth(authOptionsForProvider(providerFromRequest(request)))(request, context);
}

export { handler as GET, handler as POST };
