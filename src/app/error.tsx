"use client";

import { BrandLogo } from "@/components/branding/brand-logo";

import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="browse-page">
      <Link href="/" className="brand">
        <BrandLogo />
      </Link>
      <div className="catalog-state" role="alert">
        <h1>We couldn’t load this story</h1>
        <p>Please try again, or explore another part of the catalog.</p>
        <button className="primary-action" onClick={reset}>
          Try again
        </button>
        <Link href="/">Back to home</Link>
      </div>
    </main>
  );
}
