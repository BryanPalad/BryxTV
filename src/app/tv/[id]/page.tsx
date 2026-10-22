import {
  DetailsPage,
  detailsMetadata,
} from "@/features/catalog/pages/details-page";
export function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return detailsMetadata("tv", params);
}
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DetailsPage type="tv" params={params} />;
}
