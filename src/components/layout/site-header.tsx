import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { categories, type Category } from "@/constants/site";
export function SiteHeader({ active }: { active: Category }) {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="BryxTV home">
        <Clapperboard aria-hidden="true" size={27} />
        <span>
          Bryx<span className="text-primary">TV</span>
        </span>
      </Link>
      <nav aria-label="Main navigation">
        {categories.map((category) => (
          <Link
            key={category}
            href={
              category === "Home"
                ? "/"
                : `/?category=${encodeURIComponent(category)}`
            }
            aria-current={active === category ? "page" : undefined}
          >
            {category}
          </Link>
        ))}
      </nav>
      <span className="preview-label">THE PREVIEW COLLECTION</span>
    </header>
  );
}
