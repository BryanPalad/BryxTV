import {
  DetailsPage,
  detailsMetadata,
} from "@/features/catalog/pages/details-page";
export function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return detailsMetadata("movie", params);
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DetailsPage type="movie" params={params} />;
}
