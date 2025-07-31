import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoltAgent Client-Side Tools",
  description: "Smooth developer experience for client-side tools with VoltAgent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
