import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import ClientOnly from "@/components/ClientOnly";

export const metadata: Metadata = {
  title: "SIGNAL — Shell Intelligence System",
  description:
    "System for Intelligent Geopolitical News and Asset Linking. Enterprise-grade crude oil market intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#0A0E17] text-[#E2E8F0] font-sans" suppressHydrationWarning>
        <ClientOnly>
          <AuthProvider>{children}</AuthProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
