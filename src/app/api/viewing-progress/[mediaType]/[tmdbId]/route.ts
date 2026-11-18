import { handleProgress } from "@/features/history/handler";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ mediaType: string; tmdbId: string }> }) {
  return handleProgress(request, await params);
}
