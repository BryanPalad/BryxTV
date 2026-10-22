import Link from "next/link";
import { Search } from "lucide-react";
/** Search uses a URL-driven server page, so no API credential enters the browser. */
export function SearchTrigger() {
  return (
    <Link className="icon-button" href="/search" aria-label="Search titles">
      <Search size={20} aria-hidden="true" />
    </Link>
  );
}
