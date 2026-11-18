import { WatchPage } from "@/features/playback/components/watch-page";
import type { SearchParams } from "@/types/catalog";
export const metadata = {
  title: "Watch episode",
  robots: { index: false, follow: true },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return (
    <WatchPage type="tv" id={(await params).id} query={await searchParams} />
  );
}
