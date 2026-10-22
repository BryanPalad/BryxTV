import Link from "next/link";
import { Film } from "lucide-react";
export function CatalogState({
  title,
  message,
  href,
}: {
  title: string;
  message: string;
  href?: string;
}) {
  return (
    <div className="catalog-state" role="status">
      <Film size={30} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{message}</p>
      {href && <Link href={href}>Try again</Link>}
    </div>
  );
}
