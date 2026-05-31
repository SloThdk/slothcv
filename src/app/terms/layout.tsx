/**
 * Server-component layout for /terms, present purely to attach page metadata.
 * The page itself is a client component and so cannot export `metadata`. This
 * wrapper supplies the title, description and canonical, then renders the page
 * untouched.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The simple terms for using SlothCV: a free CV builder, up to 5 CVs per account, vector PDF export, no watermarks, and no signup wall to export.",
  alternates: { canonical: "/terms/" },
};

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
