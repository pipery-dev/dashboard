import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return <DashboardShell session={session} />;
}
