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
      <head>
        {/* Inline script — runs synchronously before first paint to prevent
            a flash of the wrong theme when the user has a non-default theme
            stored in localStorage. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('signal_theme');if(t==='dark'||t==='black'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--shell-bg)] text-[var(--shell-text)] font-sans" suppressHydrationWarning>
        {/* ThemeProvider is intentionally OUTSIDE ClientOnly so it mounts
            immediately and applies the persisted theme without a flash. */}
        <ThemeProvider>
          <ClientOnly>
            <AuthProvider>
              <AlertProvider>
                {children}
                <ToastContainer />
              </AlertProvider>
            </AuthProvider>
          </ClientOnly>
        </ThemeProvider>
      </body>
    </html>
  );
}
