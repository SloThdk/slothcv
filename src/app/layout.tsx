/**
 * Root layout — wraps every page in the site shell (header + footer) and
 * mounts the Sonner toast viewport. AuthProvider hangs at the top so any
 * descendant can call `useAuth()` without prop-drilling.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "slothcv — free, beautiful CVs",
  description:
    "Free, beautiful CVs. No signup walls, no watermarks. Drag, drop, design. Export to PDF.",
  openGraph: {
    title: "slothcv",
    description: "Free, beautiful CVs. No signup walls, no watermarks.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
