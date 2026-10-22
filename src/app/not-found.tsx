import { BrandLogo } from "@/components/branding/brand-logo";
import Link from "next/link";
export default function NotFound() {
  return (
    <main className="browse-page">
      <Link href="/" className="brand">
        <BrandLogo />
      </Link>
      <div className="catalog-state">
        <h1>Story not found</h1>
        <p>
          This title or page isn’t available. Explore another collection or
          start a new search.
        </p>
        <Link href="/">Back to home</Link>
        <Link href="/search">Search titles</Link>
      </div>
    </main>
  );
}
