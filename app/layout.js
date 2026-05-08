import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = {
  title: "Pipery Dashboard",
  description: "Local-first dashboard for browsing Pipery GitHub artifacts and inspecting pipery.jsonl files.",
  applicationName: "Pipery Dashboard",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pipery Dashboard"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport = {
  themeColor: "#f4efe5"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
