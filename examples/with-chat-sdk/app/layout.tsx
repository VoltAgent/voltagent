import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltAgent + Chat SDK Slack Bot",
  description: "Slack bot example powered by Chat SDK transport and VoltAgent reasoning.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
