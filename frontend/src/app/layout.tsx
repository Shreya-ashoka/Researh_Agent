import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LangGraph Research Agent",
  description: "AI-powered multi-step research assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
