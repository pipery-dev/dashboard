import NextAuth from "next-auth";
import { authOptionsForProvider } from "@/lib/auth";

function handler(request, context) {
  return NextAuth(authOptionsForProvider("dex"))(request, context);
}

export { handler as GET, handler as POST };
