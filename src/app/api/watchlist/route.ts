import { getSession } from "@/lib/auth/session";
import { handleWatchlist } from "@/features/watchlist/handler";
import { listWatchlist, addWatchlist, removeWatchlist, isWatchlisted } from "@/features/watchlist/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function handle(request: Request) {
  return handleWatchlist(request, {
    getUser: async () => (await getSession())?.user.id ?? null,
    list: listWatchlist, has: isWatchlisted, add: addWatchlist, remove: removeWatchlist,
  });
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
