import Link from "next/link";
import { site } from "@/constants/site";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Link href="/" className="brand">
          Bryx<span className="text-primary">TV</span>
        </Link>
        <p>{site.tagline}</p>
      </div>
      <p>Made for the love of stories.</p>
      <small>
        © {new Date().getFullYear()} BryxTV · Demo catalog. No playback
        available.
      </small>
    </footer>
  );
}
