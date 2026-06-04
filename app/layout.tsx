import type { Metadata } from "next";
import { Geist, EB_Garamond } from "next/font/google";
import "./globals.css";

// Fonts are loaded at the root so the blog (which uses them) can reference the
// CSS variables. The landing page uses its own Courier stack and ignores these.
const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-garamond",
});

export const metadata: Metadata = {
  title: "chai",
  description: "Chaidhat Chaimongkol — personal site and blog.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${garamond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
