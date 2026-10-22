import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { paginatedHref } from "@/features/catalog/utils";
import type { SearchParams } from "@/types/catalog";
export function Pagination({
  path,
  params,
  page,
  totalPages,
}: {
  path: string;
  params: SearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages < 2) return null;
  return (
    <nav className="pagination" aria-label="Results pagination">
      {page > 1 ? (
        <Link href={paginatedHref(path, params, page - 1)} rel="prev">
          <ChevronLeft size={17} aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span aria-disabled="true">
          <ChevronLeft size={17} aria-hidden="true" /> Previous
        </span>
      )}
      <span aria-current="page">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={paginatedHref(path, params, page + 1)} rel="next">
          Next <ChevronRight size={17} aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true">
          Next <ChevronRight size={17} aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
