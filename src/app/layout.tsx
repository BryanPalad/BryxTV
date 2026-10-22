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
  icons: {
    icon: [
      { url: "/branding/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/branding/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/branding/favicon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/branding/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
