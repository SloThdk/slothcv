/**
 * Server-component layout for /privacy, present purely to attach page
 * metadata. The page itself is a client component (it reads the language
 * toggle) and so cannot export `metadata`. This wrapper supplies the title,
 * description and self-referencing canonical, then renders the page untouched.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How SlothCV handles your data: EU-hosted, essential cookies only, no analytics, no third-party trackers, no advertising.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
