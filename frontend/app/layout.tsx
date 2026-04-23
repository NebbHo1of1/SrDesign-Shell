import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { AlertProvider } from "@/lib/alerts";
import { ThemeProvider } from "@/lib/theme";
import ClientOnly from "@/components/ClientOnly";
import ToastContainer from "@/components/ToastContainer";

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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--shell-bg)] text-[var(--shell-text)] font-sans" suppressHydrationWarning>
        <ClientOnly>
          <ThemeProvider>
            <AuthProvider>
              <AlertProvider>
                {children}
                <ToastContainer />
              </AlertProvider>
            </AuthProvider>
          </ThemeProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
