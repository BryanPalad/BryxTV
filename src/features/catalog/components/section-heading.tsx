import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeading({
  id,
  title,
  description,
  href,
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2 id={`${id}-heading`}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link className="view-all" href={href}>
          View all <ChevronRight size={14} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
