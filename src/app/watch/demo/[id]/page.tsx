import type { SearchParams } from "@/types/catalog";
import { WatchPage } from "@/features/playback/components/watch-page";
export const metadata = {
  title: "Authorized playback demo",
  robots: { index: false, follow: true },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  return <WatchPage type="demo" id={(await params).id} query={await searchParams} />;
}
