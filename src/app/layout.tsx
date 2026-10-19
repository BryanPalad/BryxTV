import type { Metadata } from "next";
import { site } from "@/constants/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary", title: site.name, description: site.description },
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
